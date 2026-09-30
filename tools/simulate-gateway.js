// Simulated gateway: publishes node reports to the real broker exactly as the V-Link
// gateway does, then checks that the hub turned them into positions.
//
//   node tools/simulate-gateway.js                 test node 99, every 5 s, 40 reports (~200 s)
//   node tools/simulate-gateway.js --id 5          pose as the real node 5 (shows as Jackline)
//   node tools/simulate-gateway.js --count 0       run until Ctrl+C
//   node tools/simulate-gateway.js --posture lying hold one posture: cycle | standing | lying
//
// Default posture cycle: walk 25 s -> stand still 6 s -> lie down (past the Man down time) -> repeat.
//   node tools/simulate-gateway.js --interval 1000 --url mqtt://host:1883
//
// What it proves:
//   "published"      the broker accepted the report on /mapper/data (what the gateway does)
//   "hub position"   the hub received it and published a position on /mapper/pos
// When both show up, the path gateway -> broker -> hub -> twin works; once the real gateway's
// log shows "Sent", its reports take exactly the same path.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mqtt from 'mqtt';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, '..', 'config', 'room.json'), 'utf8'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const url = arg('url', config.mqtt.url);
const topic = arg('topic', config.mqtt.topic);
const posTopic = config.mqtt.publishTopic;
const nodeId = Number(arg('id', 99));
const intervalMs = Number(arg('interval', 5000)); // the node's REPORT_MS
const count = Number(arg('count', 40));

// Posture: "cycle" (default) walks, stops, lies down, gets up again, so the twin shows every
// state; "standing" or "lying" hold one posture.
const postureMode = arg('posture', 'cycle');
const lyingSeconds = config.alerts?.manDownSeconds ? config.alerts.manDownSeconds + 7 : 15;
const CYCLE = [
  { name: 'walking', seconds: 25, G: 1, M: 1 },
  { name: 'standing still', seconds: 6, G: 1, M: 0 },
  { name: 'lying down', seconds: lyingSeconds, G: 0, M: 0 }, // long enough for "Man down"
];
const cycleLength = CYCLE.reduce((sum, s) => sum + s.seconds, 0);
function stateAt(t) {
  if (postureMode === 'standing') return CYCLE[0];
  if (postureMode === 'lying') return CYCLE[2];
  let into = t % cycleLength;
  for (const s of CYCLE) {
    if (into < s.seconds) return s;
    into -= s.seconds;
  }
  return CYCLE[0];
}

// Walk a slow circle around the middle of the room; the position only advances while walking.
const { x: X, z: Z } = config.size;
const radius = Math.min(X, Z) * 0.25;
let angle = 0;
function positionAtAngle(a) {
  return { x: X / 2 + radius * Math.cos(a), z: Z / 2 + radius * Math.sin(a) };
}

// Slant distance from each anchor (A, B, C) to the tag, metres with 2 decimals - the same
// numbers the gateway publishes after converting the node's cm values. Lying down puts the
// tag near the floor, which changes the distances just as it does for the real node.
function rangesAt(p, lying) {
  const tagY = lying ? config.tagHeightLying ?? 0.25 : config.tagHeight;
  return config.anchors.map((a) => {
    const d = Math.hypot(a.x - p.x, a.y - tagY, a.z - p.z);
    return +(d + (Math.random() - 0.5) * 0.06).toFixed(2);
  });
}

console.log(`broker ${url}`);
console.log(`publishing to ${topic} as node ${nodeId}, every ${intervalMs} ms, ${count || 'unlimited'} reports`);

const client = mqtt.connect(url, {
  clientId: `mapper-sim-${Math.random().toString(16).slice(2, 10)}`,
  connectTimeout: 8000,
  reconnectPeriod: 3000,
});

let seq = 0;
let sent = 0;
let hubReplies = 0;
let timer = null;
const started = Date.now();

client.on('connect', () => {
  console.log('connected to broker');
  if (posTopic) client.subscribe(posTopic);
  if (!timer) {
    publish();
    timer = setInterval(publish, intervalMs);
  }
});
client.on('error', (e) => console.error('mqtt error:', e.message));
client.on('offline', () => console.warn('broker unreachable - retrying'));

client.on('message', (t, buf) => {
  if (t !== posTopic) return;
  let p;
  try {
    p = JSON.parse(buf.toString('utf8'));
  } catch {
    return;
  }
  if (String(p.id ?? p.I) !== String(nodeId)) return; // someone else's position
  hubReplies++;
  const where = typeof p.x === 'number' && typeof p.z === 'number' ? `x=${p.x.toFixed(2)} z=${p.z.toFixed(2)} m` : JSON.stringify(p);
  console.log(`  hub position for node ${nodeId}: ${where}`);
});

let lastState = null;
function publish() {
  const t = (Date.now() - started) / 1000;
  const state = stateAt(t);
  if (state.M) angle += 0.15 * (intervalMs / 1000); // ~0.4 m/s around the circle
  const p = positionAtAngle(angle);
  if (state !== lastState) {
    console.log(`--- now ${state.name}${state.G === 0 ? ` (Man down alert after ${config.alerts?.manDownSeconds ?? '?'} s)` : ''}`);
    lastState = state;
  }
  const report = {
    I: nodeId,
    T: 27,
    P: 1012,
    G: state.G, // 1 standing, 0 lying
    M: state.M, // 1 moving
    U: rangesAt(p, state.G === 0),
    S: seq,
  };
  seq = (seq + 1) % 256;
  const text = JSON.stringify(report);
  client.publish(topic, text, { qos: 0, retain: false }, (err) => {
    if (err) {
      console.error('publish failed:', err.message);
      return;
    }
    sent++;
    console.log(`published #${sent}: ${text}   (${state.name} at x=${p.x.toFixed(2)} z=${p.z.toFixed(2)})`);
    if (count && sent >= count) finish();
  });
}

function finish() {
  clearInterval(timer);
  // Give the hub a moment to answer the last report.
  setTimeout(() => {
    console.log('');
    console.log(`sent ${sent} reports, hub answered ${hubReplies}`);
    if (!hubReplies && posTopic) {
      console.log(`no position back on ${posTopic}: the broker works, but check the hub is running`);
      console.log('(systemctl status mapper-hub on the server) and subscribed to ' + topic);
    } else {
      console.log('broker and hub OK - open the twin and look for node ' + nodeId);
    }
    client.end();
  }, 3000);
}

process.on('SIGINT', finish);

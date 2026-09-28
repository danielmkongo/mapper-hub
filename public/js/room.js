// The lab, modelled from the site photos.
//
// Frame: origin on the floor in the north-west corner. x runs east along the window
// wall, z runs south into the room, y is up. Metres throughout.
//
//   north (z=0)   floor-to-ceiling window, long workbench with monitor + PC tower
//   east  (x=X)   pale green wall, whiteboard, bench of patient monitors
//   south (z=Z)   orange sapele sliding panels in dark frames
//   west  (x=0)   doorway + electric meter, frosted glass partition, foam corner
//   centre        octagonal meeting table, mesh office chairs and sled chairs
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

const M = {}; // shared materials, created once

function materials(size) {
  if (M.ready) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.wall = std({ color: 0xdfe7d6, roughness: 0.92 });
  M.floor = new THREE.MeshPhysicalMaterial({
    map: T.marbleTiles(size.x, size.z), roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.12,
  });
  M.ceiling = std({ map: T.ceilingTiles(size.x, size.z), roughness: 0.95 });
  M.frame = std({ color: 0x2a221d, roughness: 0.38, metalness: 0.55 });
  M.steel = std({ color: 0x15171a, roughness: 0.45, metalness: 0.6 });
  M.chrome = std({ color: 0xd9dde2, roughness: 0.12, metalness: 1.0 });
  M.oak = std({ map: T.oak(), roughness: 0.42 });
  M.oakEdge = std({ color: 0x3a342e, roughness: 0.5 });
  M.sapele = std({ map: T.sapele(), roughness: 0.38 });
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transmission: 1, roughness: 0.03, thickness: 0.01, ior: 1.5,
    transparent: true, opacity: 1, envMapIntensity: 0.6,
  });
  M.frosted = new THREE.MeshPhysicalMaterial({
    color: 0xf4f6f7, transmission: 0.82, roughness: 0.55, thickness: 0.02, transparent: true,
  });
  M.blackPlastic = std({ color: 0x141414, roughness: 0.55 });
  M.fabric = std({ color: 0x1b1c1f, roughness: 0.95 });
  M.whitePlastic = std({ color: 0xf1f2f0, roughness: 0.35 });
  M.skirting = std({ color: 0xe9ecee, roughness: 0.3 });
  M.foam = std({ color: 0x1c1a19, roughness: 1 });
  M.door = std({ color: 0xb49a78, roughness: 0.5 });
  M.ready = true;
  return M;
}

function mesh(geo, mat, x, y, z, { cast = true, receive = true, ry = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

const box = (w, h, d, mat, x, y, z, opts) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opts);
const rbox = (w, h, d, r, mat, x, y, z, opts) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, opts);
const cyl = (rt, rb, h, seg, mat, x, y, z, opts) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, opts);

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

// Black steel frame table/bench with a laminate top.
function bench(g, x, z, w, d, h, ry = 0, shelf = true) {
  const b = new THREE.Group();
  b.add(box(w, 0.025, d, M.oak, 0, h - 0.0125, 0));
  b.add(box(w, 0.026, d + 0.004, M.oakEdge, 0, h - 0.0125, 0, { cast: false })); // edge band
  b.children[1].scale.set(1.002, 0.9, 1);
  const legT = 0.035;
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    b.add(box(legT, h - 0.025, legT, M.steel, sx * (w / 2 - 0.04), (h - 0.025) / 2, sz * (d / 2 - 0.04)));
  b.add(box(w - 0.08, 0.03, legT, M.steel, 0, h - 0.06, d / 2 - 0.04));
  b.add(box(w - 0.08, 0.03, legT, M.steel, 0, h - 0.06, -d / 2 + 0.04));
  if (shelf) b.add(box(w - 0.1, 0.02, d - 0.12, M.steel, 0, 0.16, 0));
  b.position.set(x, 0, z);
  b.rotation.y = ry;
  g.add(b);
  return b;
}

function octagonTable(g, x, z) {
  const t = new THREE.Group();
  const R = 0.8, h = 0.75;
  const top = mesh(new THREE.CylinderGeometry(R, R, 0.03, 8), M.oak, 0, h - 0.015, 0);
  top.rotation.y = Math.PI / 8;
  t.add(top);
  const edge = mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.022, 8, 1, true), M.oakEdge, 0, h - 0.015, 0);
  edge.rotation.y = Math.PI / 8;
  t.add(edge);
  // two crossed steel frames (the photo shows square-section legs splayed from centre)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const lx = Math.cos(a) * 0.55, lz = Math.sin(a) * 0.55;
    t.add(box(0.04, h - 0.03, 0.04, M.steel, lx, (h - 0.03) / 2, lz));
    const rail = box(0.55, 0.03, 0.03, M.steel, lx / 2, h - 0.06, lz / 2);
    rail.rotation.y = -a;
    t.add(rail);
    const foot = box(0.55, 0.025, 0.03, M.steel, lx / 2, 0.02, lz / 2);
    foot.rotation.y = -a;
    t.add(foot);
  }
  t.add(cyl(0.05, 0.05, 0.2, 16, M.steel, 0, 0.35, 0)); // centre hub
  t.position.set(x, 0, z);
  g.add(t);
  return t;
}

// Mesh high-back office chair with headrest and 5-star chrome base.
function officeChair(g, x, z, ry) {
  const c = new THREE.Group();
  // base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(0.32, 0.03, 0.045, M.chrome, Math.cos(a) * 0.16, 0.07, Math.sin(a) * 0.16);
    arm.rotation.y = -a;
    c.add(arm);
    c.add(mesh(new THREE.SphereGeometry(0.028, 12, 8), M.blackPlastic, Math.cos(a) * 0.31, 0.03, Math.sin(a) * 0.31));
  }
  c.add(cyl(0.022, 0.022, 0.32, 16, M.chrome, 0, 0.24, 0));
  c.add(cyl(0.032, 0.032, 0.12, 16, M.blackPlastic, 0, 0.14, 0));
  // seat
  c.add(rbox(0.5, 0.08, 0.48, 0.03, M.fabric, 0, 0.47, 0));
  c.add(box(0.44, 0.025, 0.42, M.blackPlastic, 0, 0.42, 0));
  // back: mesh panel (alpha ribbing) in a plastic frame
  const meshMat = new THREE.MeshStandardMaterial({
    color: 0x16171a, roughness: 0.8, alphaMap: T.meshBack(), transparent: true, side: THREE.DoubleSide,
  });
  const back = mesh(new THREE.PlaneGeometry(0.44, 0.55), meshMat, 0, 0.84, 0.26, { receive: false });
  back.rotation.x = -0.12;
  c.add(back);
  const frameGeo = new THREE.TorusGeometry(0.25, 0.012, 8, 32);
  const f = mesh(frameGeo, M.blackPlastic, 0, 0.84, 0.26);
  f.scale.set(0.9, 1.12, 1);
  f.rotation.x = -0.12;
  c.add(f);
  c.add(box(0.05, 0.36, 0.03, M.blackPlastic, 0, 0.62, 0.25)); // spine
  // headrest
  const head = rbox(0.28, 0.12, 0.06, 0.03, M.fabric, 0, 1.22, 0.31);
  head.rotation.x = -0.18;
  c.add(head);
  c.add(box(0.03, 0.16, 0.02, M.blackPlastic, 0, 1.12, 0.3));
  // arms
  for (const s of [-1, 1]) {
    c.add(box(0.035, 0.2, 0.035, M.blackPlastic, s * 0.26, 0.58, 0.02));
    c.add(rbox(0.06, 0.03, 0.26, 0.012, M.blackPlastic, s * 0.26, 0.69, 0.0));
  }
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  return c;
}

// Stackable black shell chair on a chrome sled base.
function sledChair(g, x, z, ry) {
  const c = new THREE.Group();
  const tube = (pts) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 40, 0.011, 8), M.chrome, 0, 0, 0);
  };
  for (const s of [-1, 1]) {
    c.add(tube([[s * 0.22, 0.44, -0.22], [s * 0.22, 0.02, -0.26], [s * 0.22, 0.01, 0.2], [s * 0.21, 0.44, 0.22], [s * 0.2, 0.86, 0.26]]));
  }
  c.add(rbox(0.46, 0.05, 0.44, 0.02, M.fabric, 0, 0.46, 0));
  const back = rbox(0.44, 0.34, 0.03, 0.02, M.blackPlastic, 0, 0.72, 0.24);
  back.rotation.x = -0.1;
  c.add(back);
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  return c;
}

function patientMonitor(g, x, y, z, ry, seed, screens) {
  const m = new THREE.Group();
  m.add(rbox(0.34, 0.28, 0.14, 0.03, M.whitePlastic, 0, 0.14, 0));
  m.add(rbox(0.1, 0.24, 0.12, 0.02, M.whitePlastic, 0.2, 0.12, 0)); // side module
  const screenTex = T.vitalsScreen(seed);
  screens.push(screenTex);
  const screen = mesh(new THREE.PlaneGeometry(0.27, 0.2),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }), -0.01, 0.15, 0.0705, { cast: false });
  m.add(screen);
  m.add(box(0.08, 0.02, 0.02, M.whitePlastic, 0, 0.3, 0)); // handle
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
}

function deskMonitor(g, x, y, z, ry) {
  const m = new THREE.Group();
  m.add(box(0.2, 0.012, 0.16, M.steel, 0, 0.006, 0));
  m.add(box(0.04, 0.34, 0.03, M.steel, 0, 0.18, 0.04));
  m.add(rbox(0.56, 0.34, 0.03, 0.006, M.blackPlastic, 0, 0.4, 0));
  m.add(mesh(new THREE.PlaneGeometry(0.535, 0.31),
    new THREE.MeshBasicMaterial({ map: T.terminal(), toneMapped: false }), 0, 0.4, -0.0155, { cast: false, ry: Math.PI }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
}

// ---------------------------------------------------------------------------
// Room shell
//
// Everything is placed relative to the walls, so changing size in config/room.json moves
// the furniture with it. Proportions follow the site photos.
// ---------------------------------------------------------------------------
export const LAYOUT = (size) => {
  const { x: X, z: Z } = size;
  // North wall, west to east: acoustic-foam panel, the windows, then a solid green section
  // (in line with the glass) carrying the whiteboard.
  const winX0 = 0.55, winX1 = X - 1.45;
  const deskX0 = 0.6, deskX1 = winX1 - 0.1;
  const benchZ0 = 0.75, benchZ1 = Math.min(benchZ0 + 3.2, Z - 1.2);
  return {
    winX0, winX1,                         // glazed span of the north wall
    deskX0, deskX1,                       // window desk span
    benchZ0, benchZ1,                     // monitor bench span along the east wall
    table: { x: X * 0.47, z: Z * 0.56 },  // octagon table centre
    doorZ0: Z - 1.0, doorZ1: Z - 0.1,     // doorway on the west wall
  };
};

export function buildRoom(scene, config) {
  const { x: X, z: Z, height: H } = config.size;
  const L = LAYOUT(config.size);
  materials(config.size);
  const g = new THREE.Group();
  g.name = 'room';
  scene.add(g);
  const screens = [];

  const floor = mesh(new THREE.PlaneGeometry(X, Z), M.floor, X / 2, 0, Z / 2, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  // Each enclosing surface is its own group so the viewer can cut away whichever ones
  // stand between the camera and the room (dollhouse view).
  const north = new THREE.Group(), east = new THREE.Group(), south = new THREE.Group();
  const west = new THREE.Group(), ceilG = new THREE.Group();
  const outside = new THREE.Group(); // beyond the walls: hidden in the plan view
  const ceil = mesh(new THREE.PlaneGeometry(X, Z), M.ceiling, X / 2, H, Z / 2, { cast: false });
  ceil.rotation.x = Math.PI / 2;
  ceilG.add(ceil);

  // -------- north: foam panel | windows | green wall with the whiteboard --------
  const { winX0: w0, winX1: w1 } = L;
  const WW = w1 - w0;
  const sill = 0.12;
  north.add(box(WW, sill, 0.08, M.frame, (w0 + w1) / 2, sill / 2, -0.02));
  north.add(mesh(new THREE.PlaneGeometry(WW, H - sill - 0.05), M.glass, (w0 + w1) / 2, sill + (H - sill - 0.05) / 2, 0, { cast: false, receive: false }));
  [0, 0.3, 0.52, 0.75, 1].forEach((f) => north.add(box(0.06, H, 0.1, M.frame, w0 + WW * f, H / 2, 0)));
  north.add(box(WW, 0.06, 0.1, M.frame, (w0 + w1) / 2, 2.25, 0));
  north.add(box(WW, 0.05, 0.1, M.frame, (w0 + w1) / 2, H - 0.025, 0));
  // the glass door in the window run
  north.add(box(0.05, 2.1, 0.1, M.frame, w0 + WW * 0.33, 1.05, 0));
  north.add(box(0.05, 2.1, 0.1, M.frame, w0 + WW * 0.5, 1.05, 0));
  // acoustic foam panel at the west end of the glass
  north.add(box(w0, H, 0.06, M.foam, w0 / 2, H / 2, -0.03, { cast: false }));
  const foamGeo = new THREE.ConeGeometry(0.045, 0.05, 4);
  for (let fy = 0.25; fy < H - 0.2; fy += 0.08)
    for (let fx = 0.06; fx < w0 - 0.04; fx += 0.08) {
      const f = mesh(foamGeo, M.foam, fx, fy, 0.02, { cast: false, receive: false });
      f.rotation.set(Math.PI / 2, Math.PI / 4, 0);
      north.add(f);
    }
  // solid green section east of the glass, with the whiteboard on it
  const wallW = X - w1;
  north.add(mesh(new THREE.PlaneGeometry(wallW, H), M.wall, w1 + wallW / 2, H / 2, 0, { cast: false }));
  north.add(box(wallW, 0.08, 0.012, M.skirting, w1 + wallW / 2, 0.04, 0.006, { cast: false }));
  const wbx = w1 + wallW / 2 + 0.05;
  north.add(box(0.98, 0.62, 0.03, new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.7, roughness: 0.3 }), wbx, 1.72, 0.015));
  north.add(mesh(new THREE.PlaneGeometry(0.94, 0.58), new THREE.MeshStandardMaterial({ map: T.whiteboard(), roughness: 0.18 }),
    wbx, 1.72, 0.032, { cast: false }));
  north.add(box(0.6, 0.02, 0.05, M.frame, wbx, 1.41, 0.04, { cast: false }));
  // outside: a curved panorama, so it holds up from any angle through the glass
  const panoMat = new THREE.MeshBasicMaterial({ map: T.citySunset(), side: THREE.BackSide, toneMapped: false });
  north.add(mesh(new THREE.CylinderGeometry(9, 9, 11, 48, 1, true, -Math.PI * 0.42, Math.PI * 0.84), panoMat,
    X / 2, 3.0, Z / 2, { cast: false, receive: false, ry: Math.PI }));
  north.add(box(X + 2, 0.12, 1.4, new THREE.MeshStandardMaterial({ color: 0x8b8680, roughness: 0.9 }), X / 2, -0.25, -0.9, { cast: false }));

  // -------- east: green wall --------
  east.add(mesh(new THREE.PlaneGeometry(Z, H), M.wall, X, H / 2, Z / 2, { cast: false, ry: -Math.PI / 2 }));
  east.add(box(0.012, 0.08, Z, M.skirting, X - 0.006, 0.04, Z / 2, { cast: false }));

  // -------- south: orange sliding panels --------
  const panelW = X / 3;
  for (let i = 0; i < 3; i++) {
    south.add(box(panelW - 0.06, H - 0.1, 0.03, M.sapele, panelW * (i + 0.5), (H - 0.1) / 2 + 0.05, Z - 0.04 - (i % 2) * 0.04));
    south.add(box(0.05, H, 0.07, M.frame, panelW * i, H / 2, Z - 0.035));
  }
  south.add(box(0.05, H, 0.07, M.frame, X, H / 2, Z - 0.035));
  south.add(box(X, 0.06, 0.1, M.frame, X / 2, H - 0.03, Z - 0.05));
  south.add(box(X, 0.05, 0.1, M.frame, X / 2, 0.025, Z - 0.05));

  // -------- west: foam pier, frosted partition, meter, doorway --------
  const { doorZ0, doorZ1 } = L;
  west.add(box(0.1, H, 0.55, M.wall, -0.05, H / 2, 0.275));
  west.add(box(0.1, H, Z - doorZ1, M.wall, -0.05, H / 2, (doorZ1 + Z) / 2));
  west.add(box(0.1, H - 2.1, doorZ1 - doorZ0, M.wall, -0.05, 2.1 + (H - 2.1) / 2, (doorZ0 + doorZ1) / 2));
  west.add(box(0.12, H, 0.08, M.frame, -0.04, H / 2, doorZ0));
  west.add(box(0.12, H, 0.08, M.frame, -0.04, H / 2, doorZ1));
  west.add(box(0.12, 0.08, doorZ1 - doorZ0, M.frame, -0.04, 2.1, (doorZ0 + doorZ1) / 2));
  outside.add(box(1.4, H, 1.6, new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 0.9, side: THREE.BackSide }),
    -0.8, H / 2, (doorZ0 + doorZ1) / 2, { cast: false }));
  const leaf = box(0.04, 2.04, 0.88, M.door, -0.42, 1.02, doorZ0 + 0.35);
  leaf.rotation.y = Math.PI / 2.3;
  outside.add(leaf);
  const pz0 = 0.55, pz1 = doorZ0 - 0.2;
  west.add(box(0.1, H, 0.2, M.wall, -0.05, H / 2, (pz1 + doorZ0) / 2)); // meter pier
  west.add(mesh(new THREE.PlaneGeometry(pz1 - pz0, H - 0.1), M.frosted, 0, H / 2, (pz0 + pz1) / 2, { cast: false, ry: Math.PI / 2 }));
  outside.add(box(0.5, 1.9, 0.9, new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.8 }), -0.6, 0.95, Z * 0.4, { cast: false }));
  outside.add(box(0.3, 0.35, 0.4, new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.8 }), -0.6, 2.05, Z * 0.36, { cast: false }));
  [pz0, (pz0 + pz1) / 2, pz1].forEach((z) => west.add(box(0.07, H, 0.06, M.frame, 0, H / 2, z)));
  [0.05, 1.3, H - 0.05].forEach((y) => west.add(box(0.07, 0.06, pz1 - pz0, M.frame, 0, y, (pz0 + pz1) / 2, { cast: false })));
  [[1.65, 0.2], [1.35, 0.2]].forEach(([y, z]) =>
    west.add(box(0.02, 0.26, 0.2, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 }), 0.01, y, z + 0.1, { cast: false })));
  west.add(rbox(0.04, 0.26, 0.14, 0.01, new THREE.MeshStandardMaterial({ color: 0xcfd2cf, roughness: 0.5 }), 0.02, 1.62, doorZ0 - 0.1, { cast: false }));
  west.add(box(0.005, 0.06, 0.08, new THREE.MeshStandardMaterial({ color: 0x4d6b57, roughness: 0.3 }), 0.042, 1.68, doorZ0 - 0.1, { cast: false }));
  west.add(cyl(0.004, 0.004, H - 1.75, 6, new THREE.MeshStandardMaterial({ color: 0xeeeeee }), 0.02, 1.75 + (H - 1.75) / 2, doorZ0 - 0.06, { cast: false }));
  west.add(outside);

  // -------- ceiling fixtures --------
  const cassette = new THREE.Group();
  cassette.add(rbox(0.95, 0.06, 0.95, 0.02, M.whitePlastic, 0, 0, 0, { cast: false }));
  const gr = mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: T.grille(28), roughness: 0.6 }), 0, -0.031, 0, { cast: false });
  gr.rotation.x = Math.PI / 2;
  cassette.add(gr);
  const louvreMat = new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.add(box(0.62, 0.012, 0.07, louvreMat, 0, -0.035, 0.37, { cast: false }));
    pivot.rotation.y = (i * Math.PI) / 2;
    cassette.add(pivot);
  }
  cassette.position.set(X * 0.33, H - 0.03, Z * 0.68);
  ceilG.add(cassette);

  const lamps = [];
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2 });
  [[0.2, 0.28], [0.72, 0.75]].forEach(([fx, fz]) => {
    ceilG.add(cyl(0.16, 0.16, 0.04, 32, M.whitePlastic, X * fx, H - 0.02, Z * fz, { cast: false }));
    ceilG.add(cyl(0.135, 0.135, 0.005, 32, ledMat, X * fx, H - 0.042, Z * fz, { cast: false }));
    lamps.push(new THREE.Vector3(X * fx, H - 0.06, Z * fz));
  });
  const bx = X * 0.52, bz = Z * 0.36;
  ceilG.add(cyl(0.004, 0.004, 0.14, 6, M.whitePlastic, bx, H - 0.07, bz, { cast: false }));
  ceilG.add(mesh(new THREE.SphereGeometry(0.045, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 3 }), bx, H - 0.18, bz, { cast: false }));
  lamps.push(new THREE.Vector3(bx, H - 0.2, bz));
  ceilG.add(cyl(0.06, 0.07, 0.04, 20, new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.6 }), X * 0.68, H - 0.02, Z * 0.2, { cast: false }));
  const diffMat = new THREE.MeshStandardMaterial({ map: T.grille(8, '#5a4a44', '#e7e2dc'), roughness: 0.7 });
  [[X * 0.38, 0.75, 1.2, 0.3], [X * 0.8, Z * 0.62, 0.3, 1.0]].forEach(([dx, dz, w, d]) => {
    const p = mesh(new THREE.PlaneGeometry(w, d), diffMat, dx, H - 0.002, dz, { cast: false });
    p.rotation.x = Math.PI / 2;
    ceilG.add(p);
  });

  // -------- furniture --------
  // Window desk: monitor + PC tower at the pier end, laptop mid-way, router at the far end.
  const { deskX0: x0, deskX1: x1 } = L;
  bench(g, (x0 + x1) / 2, 0.34, x1 - x0, 0.55, 0.9);
  deskMonitor(g, x0 + 0.45, 0.9, 0.3, Math.PI);
  g.add(box(0.2, 0.45, 0.42, M.blackPlastic, x0 + 0.15, 0.225, 0.36));
  g.add(box(0.22, 0.03, 0.3, M.blackPlastic, x0 + 1.15, 0.91, 0.3, { cast: false }));
  const lid = box(0.22, 0.01, 0.3, M.blackPlastic, x0 + 1.15, 1.05, 0.16);
  lid.rotation.x = -1.2;
  g.add(lid);
  g.add(box(0.12, 0.22, 0.12, M.whitePlastic, x1 - 0.2, 1.01, 0.25));
  g.add(box(0.5, 0.06, 0.3, new THREE.MeshStandardMaterial({ color: 0x2c3a52, roughness: 0.6 }), x0 + 1.6, 0.19, 0.36, { cast: false }));
  // two mesh chairs tucked in at the window desk
  officeChair(g, x0 + 1.05, 0.85, 0);
  officeChair(g, x0 + 2.0, 0.85, 0);
  // corner shelf with the blue parts box, between the desk and the monitor bench
  g.add(box(0.5, 0.02, 0.45, M.steel, X - 0.45, 0.6, 0.35));
  g.add(box(0.36, 0.12, 0.26, new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 }), X - 0.45, 0.67, 0.35));

  // Monitor bench along the east wall, patient monitors at the window end.
  const { benchZ0: z0, benchZ1: z1 } = L;
  bench(g, X - 0.34, (z0 + z1) / 2, z1 - z0, 0.6, 0.78, Math.PI / 2);
  patientMonitor(g, X - 0.28, 0.78, z0 + 0.35, -Math.PI / 2, 1, screens);
  patientMonitor(g, X - 0.28, 0.78, z0 + 0.85, -Math.PI / 2, 2, screens);
  g.add(box(0.14, 0.08, 0.1, new THREE.MeshStandardMaterial({ color: 0xd8672c, roughness: 0.5 }), X - 0.4, 0.82, z0 + 1.5, { cast: false }));
  g.add(cyl(0.05, 0.06, 0.03, 16, M.blackPlastic, X - 0.4, 0.795, z0 + 1.85, { cast: false }));
  const iron = cyl(0.006, 0.006, 0.26, 8, M.chrome, X - 0.4, 0.93, z0 + 1.85, { cast: false });
  iron.rotation.z = 0.5;
  g.add(iron);
  // sled chair pulled up to the bench by the monitors, facing the wall
  sledChair(g, X - 0.85, z0 + 0.3, -Math.PI / 2);
  // cardboard box of parts past the end of the bench
  g.add(box(0.45, 0.32, 0.35, new THREE.MeshStandardMaterial({ color: 0xa57b4f, roughness: 0.9 }), X - 0.4, 0.16, z1 + 0.35));

  // Octagon table with chairs on the sides people actually sit (west and south), placed
  // just clear of the tabletop and facing its centre.
  const { x: TX, z: TZ } = L.table;
  octagonTable(g, TX, TZ);
  const facing = (a, d) => [TX + Math.cos(a) * d, TZ + Math.sin(a) * d, Math.PI / 2 - a];
  [Math.PI, 2.35, Math.PI / 2].forEach((a) => officeChair(g, ...facing(a, 1.1)));
  sledChair(g, ...facing(0.9, 1.08));
  const [bpx, bpz] = facing(0.9, 1.26);
  g.add(rbox(0.3, 0.42, 0.18, 0.06, new THREE.MeshStandardMaterial({ color: 0x241f22, roughness: 0.9 }), bpx, 0.72, bpz));

  g.add(north, east, south, west, ceilG);

  // Collapse every static group into one mesh per material: ~500 draw calls become a few
  // dozen, the single biggest win for frame rate on phones.
  scene.updateMatrixWorld(true);
  const boundaries = new Set([north, east, south, west, ceilG, outside]);
  [g, north, east, south, west, ceilG, outside].forEach((c) => mergeStatic(c, boundaries));

  setZones(config.size);

  const shells = [
    { group: north, p: new THREE.Vector3(X / 2, 0, 0), n: new THREE.Vector3(0, 0, -1) },
    { group: east, p: new THREE.Vector3(X, 0, Z / 2), n: new THREE.Vector3(1, 0, 0) },
    { group: south, p: new THREE.Vector3(X / 2, 0, Z), n: new THREE.Vector3(0, 0, 1) },
    { group: west, p: new THREE.Vector3(0, 0, Z / 2), n: new THREE.Vector3(-1, 0, 0) },
    { group: ceilG, p: new THREE.Vector3(X / 2, H, Z / 2), n: new THREE.Vector3(0, 1, 0) },
  ];

  return { group: g, lamps, screens, shells, outside, panorama: panoMat };
}

// Merge every plain mesh under `root` (not crossing into `boundaries`) into one mesh per
// material + shadow flags, baked into root's space.
function mergeStatic(root, boundaries) {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  const walk = (o) => {
    for (const c of o.children) {
      if (c !== root && boundaries.has(c)) continue;
      if (c.isMesh && !c.isSkinnedMesh && !c.isInstancedMesh) {
        const key = `${c.material.uuid}|${c.castShadow}|${c.receiveShadow}`;
        const geo = c.geometry.index ? c.geometry.clone() : null;
        if (geo) {
          for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
          geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld));
          if (!buckets.has(key)) buckets.set(key, { mat: c.material, cast: c.castShadow, receive: c.receiveShadow, geos: [] });
          buckets.get(key).geos.push(geo);
          victims.push(c);
        }
      }
      walk(c);
    }
  };
  walk(root);
  for (const v of victims) v.parent.remove(v);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
  }
}

// ---------------------------------------------------------------------------
// Named zones, used to say *where* someone is in plain words ("near the window desk").
// ---------------------------------------------------------------------------
let ZONES = [];
function setZones(size) {
  const { x: X, z: Z } = size;
  const L = LAYOUT(size);
  ZONES = [
    { name: 'window desk', x: (L.deskX0 + L.deskX1) / 2, z: 1.0, r: 1.3 },
    { name: 'meeting table', x: L.table.x, z: L.table.z, r: 1.3 },
    { name: 'monitor bench', x: X - 0.9, z: (L.benchZ0 + L.benchZ1) / 2, r: 1.0 },
    { name: 'doorway', x: 0.5, z: (L.doorZ0 + L.doorZ1) / 2, r: 0.8 },
    { name: 'orange panels', x: X / 2, z: Z - 0.5, r: 1.0 },
    { name: 'partition', x: 0.5, z: Z * 0.35, r: 0.8 },
  ];
}

export function zoneAt(x, z) {
  let best = ZONES[0], bestD = Infinity;
  for (const zn of ZONES) {
    const d = Math.hypot(x - zn.x, z - zn.z) / zn.r;
    if (d < bestD) { bestD = d; best = zn; }
  }
  return best ? best.name : 'room';
}

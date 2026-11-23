import * as THREE from 'three';
import { OrbitControls } from './../vendor/OrbitControls.js';
import {
  rooms, outline, core, openings, windows, passable, loggias, furniture, beds, desk, diningTable, washTower, kitchen,
  loggiaTable, ausbaulinien, houseFoot, attikaFoot, HOUSE_W, HOUSE_D, HOUSE_A_DX, facts, WALL_H, r, mx, mz, units,
} from './data.js?v=2';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8ee);
scene.fog = new THREE.Fog(0xdfe8ee, 100, 240);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 500);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.497;
controls.minDistance = 0.4;
controls.maxDistance = 120;
controls.zoomToCursor = true;
controls.zoomSpeed = 1.3;

// ---------- Licht: Sonne für Uster (47.35° N), Monat wählbar ----------
const hemi = new THREE.HemisphereLight(0xeaf2ff, 0xe6ddd0, 1.25);
const amb = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(hemi, amb);
const sun = new THREE.DirectionalLight(0xfff4e2, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 180;
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
sun.target.position.set(-4, 0, 9);
// Nordrichtung gemäss Nordpfeil im Grundriss (ca. 49° im Gegenuhrzeigersinn gegenüber Plan-oben)
const NORTH = new THREE.Vector3(-0.755, 0, -0.656).normalize();
const EAST = new THREE.Vector3(0.656, 0, -0.755).normalize();
const LAT = 47.353 * Math.PI / 180, LON = 8.726;
// Pro Monat (jeweils der 15.): Tag im Jahr, Zeitgleichung in Minuten, Sommerzeit
const MONTHS = [['Januar', 15, -9, 0], ['Februar', 46, -14, 0], ['März', 74, -9, 0], ['April', 105, 0, 1], ['Mai', 135, 4, 1], ['Juni', 166, 0, 1],
  ['Juli', 196, -6, 1], ['August', 227, -4, 1], ['September', 258, 5, 1], ['Oktober', 288, 14, 1], ['November', 319, 15, 0], ['Dezember', 349, 5, 0]];
let month = 6, DECL = 0, SOLAR_NOON = 0, SUNRISE = 0, SUNSET = 0;
function setMonth(i) {
  month = i; const [, n, eot, dst] = MONTHS[i];
  DECL = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + n) / 365);
  SOLAR_NOON = 12 + (15 - LON) * 4 / 60 - eot / 60 + dst;   // Uhrzeit in MEZ bzw. MESZ
  const H0 = Math.acos(-Math.tan(LAT) * Math.tan(DECL)) * 12 / Math.PI;
  SUNRISE = SOLAR_NOON - H0; SUNSET = SOLAR_NOON + H0;
}
setMonth(6);
function sunAt(hour) {
  const H = (hour - SOLAR_NOON) * 15 * Math.PI / 180;
  const sinEl = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H);
  const el = Math.asin(sinEl), cosEl = Math.cos(el);
  const az = Math.atan2(-Math.sin(H) * Math.cos(DECL) / cosEl, (Math.sin(DECL) - sinEl * Math.sin(LAT)) / (cosEl * Math.cos(LAT)));
  const dir = NORTH.clone().multiplyScalar(Math.cos(az) * cosEl).addScaledVector(EAST, Math.sin(az) * cosEl);
  dir.y = sinEl;
  return { el, az, dir };
}
let sunHour = 16;
function applySun() {
  const s = sunAt(sunHour);
  const k = THREE.MathUtils.smoothstep(s.el, 0, 0.3);
  sun.intensity = 2.9 * k;
  sun.color.setHex(0xffb070).lerp(new THREE.Color(0xfff6e8), THREE.MathUtils.smoothstep(s.el, 0.05, 0.6));
  hemi.intensity = 0.5 + 0.6 * k; amb.intensity = 0.3 + 0.45 * k;
  sun.position.copy(sun.target.position).addScaledVector(s.dir.y > 0.02 ? s.dir : s.dir.clone().setY(0.02), 90);
  const hh = Math.floor(sunHour), mm = Math.floor((sunHour - hh) * 60);
  const azDeg = (s.az * 180 / Math.PI + 360) % 360;
  const comp = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][Math.round(azDeg / 45) % 8];
  const fmt = (t) => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
  sunLabel.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ` + (s.el > 0 ? `Sonne ${comp}, ${Math.round(s.el * 180 / Math.PI)}° hoch` : 'Sonne unter dem Horizont');
  sunInfo.textContent = `Sonnenaufgang ${fmt(SUNRISE)}, Untergang ${fmt(SUNSET)}, Höchststand ${Math.round((Math.PI / 2 - LAT + DECL) * 180 / Math.PI)}°`;
}

// ---------- Texturen (prozedural, Farbe kommt aus der Farbstimmung) ----------
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// Landhausdiele Eiche 1900 x 190 mm: Textur = 3.8 m x 1.52 m
const parkettTex = tex(1024, 512, (g, w, h) => {
  const rows = 8, rh = h / rows, pl = w / 2;
  for (let i = 0; i < rows; i++) {
    const off = rnd() * pl;
    for (let x = -pl + off; x < w; x += pl) {
      const v = 205 + rnd() * 50;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, i * rh, pl, rh);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(90,70,50,${0.04 + rnd() * 0.07})`; g.beginPath();
        const y = i * rh + rnd() * rh; g.moveTo(x, y); g.bezierCurveTo(x + pl * 0.3, y + 3, x + pl * 0.6, y - 3, x + pl, y + 1); g.stroke();
      }
      g.fillStyle = 'rgba(60,45,35,.5)'; g.fillRect(x, i * rh, 1.5, rh);
    }
    g.fillStyle = 'rgba(60,45,35,.45)'; g.fillRect(0, i * rh, w, 1.5);
  }
});
const tileTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 500; k++) { const v = 225 + rnd() * 30; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(rnd() * w, rnd() * h, 6, 6); }
  g.fillStyle = 'rgba(120,120,120,.8)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
});
const stoneTex = (speck) => tex(256, 256, (g, w, h) => {
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 2600; k++) {
    const v = 255 - rnd() * 220 * speck; g.fillStyle = `rgba(${v},${v},${v},.8)`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
});
// Mineralischer Verputz, leicht strukturiert
const renderTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 4000; k++) { const v = 215 + rnd() * 40; g.fillStyle = `rgba(${v},${v},${v},.55)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
});

// ---------- Hilfen ----------
const inRect = (x, z, q) => x >= q.x0 && x < q.x1 && z >= q.z0 && z < q.z1;
const inAny = (x, z, list) => list.some((q) => inRect(x, z, q));
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const box = (q, y0, y1, material) => {
  const g = new THREE.BoxGeometry(q.x1 - q.x0, y1 - y0, q.z1 - q.z0);
  const m = new THREE.Mesh(g, material);
  m.position.set((q.x0 + q.x1) / 2, (y0 + y1) / 2, (q.z0 + q.z1) / 2);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const part = (group, x0, x1, z0, z1, y0, y1, material) => { const m = box({ x0, x1, z0, z1 }, y0, y1, material); group.add(m); return m; };
const shift = (q, dx) => ({ ...q, x0: q.x0 + dx, x1: q.x1 + dx });
// Bodenfläche mit UV in Metern, damit Plattenformate massstäblich sind
const floorTargets = [];
function floor(q, material, tx, tz, y = 0.02) {
  const w = q.x1 - q.x0, d = q.z1 - q.z0;
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + q.x0 + w / 2) / tx, (p.getZ(i) + q.z0 + d / 2) / tz);
  const m = new THREE.Mesh(g, material);
  m.position.set(q.x0 + w / 2, y, q.z0 + d / 2); m.receiveShadow = true;
  floorTargets.push(m);
  return m;
}
const center = (room) => {
  let a = 0, cx = 0, cz = 0;
  for (const q of room.rects) {
    const s = (q.x1 - q.x0) * (q.z1 - q.z0);
    a += s; cx += s * (q.x0 + q.x1) / 2; cz += s * (q.z0 + q.z1) / 2;
  }
  return new THREE.Vector3(cx / a, 0, cz / a);
};

// ---------- Materialien der Farbstimmung ----------
const M = {
  parkett: mat(0xffffff, { map: parkettTex, roughness: 0.55 }),
  nass: mat(0xffffff, { map: tileTex, roughness: 0.3 }),
  platten: mat(0xffffff, { map: tileTex, roughness: 0.35 }),
  front: mat(0xffffff, { roughness: 0.6 }),
  stone: mat(0xffffff, { roughness: 0.25 }),
  gard: mat(0xffffff, { roughness: 0.6 }),
};
const stoneMaps = ausbaulinien.map((l) => { const t = stoneTex(l.speck); t.repeat.set(3, 3); return t; });
const tinted = []; // [material, key]
const useMat = (key) => { const m = M[key].clone(); tinted.push([m, key]); return m; };
function applyLinie(i) {
  const l = ausbaulinien[i];
  for (const [m, key] of tinted) { m.color.setHex(l[key]); if (key === 'stone') { m.map = stoneMaps[i]; m.needsUpdate = true; } }
  document.querySelectorAll('.linie').forEach((b, k) => b.classList.toggle('on', k === i));
  document.getElementById('linieText').innerHTML = l.text.map((t) => `<li>${t}</li>`).join('');
}

// ---------- Umgebung ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), mat(0xb9c2ad));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06; ground.receiveShadow = true;
scene.add(ground);

const apartment = new THREE.Group();
scene.add(apartment);
const site = new THREE.Group();
scene.add(site);

// Aktuell gewählte Wohnung (B 001 gemäss Inserat oder A 001)
let unit = units.B;
const areaOf = (room, u = unit) => (room.id === 'zimmerN' ? u.zimmerN : room.area);
const gardenMat = mat(0x86a873);
const hedgeMat = mat(0x56744f);
// Gartenanteil mit Wildhecke, pro Wohnung im Koordinatensystem des jeweiligen Hauses
for (const u of Object.values(units)) {
  const yard = new THREE.Group(); yard.position.x = u.dx; scene.add(yard);
  for (const q of u.garden.rects) yard.add(floor(q, gardenMat, 1, 1, 0.01));
  const [gw, gs, , ge] = u.garden.rects;
  yard.add(box({ x0: gw.x0 - 0.35, x1: gw.x0, z0: gw.z0, z1: gw.z1 + 0.35 }, 0, 1.1, hedgeMat));
  yard.add(box({ x0: gw.x0 - 0.35, x1: ge.x1 + 0.35, z0: gs.z1, z1: gs.z1 + 0.35 }, 0, 1.1, hedgeMat));
  yard.add(box({ x0: ge.x1, x1: ge.x1 + 0.35, z0: ge.z0, z1: ge.z1 }, 0, 1.1, hedgeMat));
}
// Aussenbelag Loggien: Feinsteinzeug 60 x 60, Steinoptik Sandbeige
const loggiaMat = mat(0xd5c8b0, { map: tileTex, roughness: 0.8 });
for (const lg of loggias) for (const q of lg.rects) apartment.add(floor(q, loggiaMat, 0.6, 0.6, 0.05));
const tree = (x, z, s = 1, color = 0x6f9163) => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 1.6 * s, 8), mat(0x6e5a48));
  trunk.position.y = 0.8 * s;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 1), mat(color, { flatShading: true }));
  crown.position.y = 2.3 * s;
  trunk.castShadow = crown.castShadow = true;
  g.add(trunk, crown); g.position.set(x, 0, z); return g;
};
[[22.8, 1.5, 1.2], [23.2, 7.5, 0.9], [23.0, 13.5, 1.1], [21.5, 21.5, 1.4], [-3.2, 1.5, 1.0], [-2.8, 22.5, 0.9],
  [-9.5, -4.5, 1.6], [-14, -4.8, 1.3], [3, -6.5, 1.2], [9, -6.8, 1.5], [15, -6.6, 1.2], [-30, 2, 1.7], [-34, 12, 1.2], [-29, 22, 1.0]]
  .forEach(([x, z, s], i) => site.add(tree(x, z, s, [0x6f9163, 0x7d9a6b, 0x8a9f74][i % 3])));
// Fussweg im Norden, Velounterstand, Zufahrt Tiefgarage, Pergola und Spielwiese im Süden
const path = mat(0xd8d3c8);
site.add(box({ x0: -40, x1: 30, z0: -3.6, z1: -2.2 }, -0.05, 0.0, path));
site.add(box({ x0: 1.0, x1: 5.0, z0: -7.4, z1: -5.2 }, 0, 0.08, mat(0xcfcac0)));
for (const x of [1.05, 4.9]) for (const z of [-7.35, -5.3]) site.add(box({ x0: x, x1: x + 0.08, z0: z, z1: z + 0.08 }, 0, 2.2, mat(0x5b5752)));
site.add(box({ x0: 0.9, x1: 5.1, z0: -7.5, z1: -5.1 }, 2.2, 2.3, mat(0x9aa58a)));
site.add(box({ x0: -9.6, x1: -2.6, z0: 21.4, z1: 25.5 }, -0.05, 0.0, mat(0x8d8a84)));
site.add(box({ x0: -9.6, x1: -2.6, z0: 21.2, z1: 21.4 }, 0, 1.0, mat(0xbdb8ae)));
{
  const wood = mat(0xa88a63, { roughness: 0.8 });
  const px0 = -20, px1 = -10.5, pz0 = 21.5, pz1 = 24.5;
  for (let x = px0; x <= px1 + 0.01; x += 2.375) for (const z of [pz0, pz1]) site.add(box({ x0: x, x1: x + 0.14, z0: z, z1: z + 0.14 }, 0, 2.6, wood));
  for (let x = px0; x <= px1; x += 0.6) site.add(box({ x0: x, x1: x + 0.08, z0: pz0, z1: pz1 + 0.14 }, 2.6, 2.75, wood));
  site.add(box({ x0: 2, x1: 18, z0: 20, z1: 26 }, -0.04, 0.0, mat(0x93b47a)));
  site.add(box({ x0: 12, x1: 15.5, z0: 22.5, z1: 22.65 }, 0.4, 0.55, wood));
  site.add(box({ x0: 13.6, x1: 13.75, z0: 21, z1: 24.5 }, 0.2, 0.35, wood));
}

// Bodenplatte, Böden, Decke
for (const q of outline) { const m = box(q, -0.2, 0, mat(0x9a9189)); m.castShadow = false; apartment.add(m); }
const roomFloors = {};
for (const room of rooms) {
  const key = room.floor;
  const m = useMat(key);
  const [tx, tz] = key === 'parkett' ? [3.8, 1.52] : key === 'platten' ? [0.6, 0.6] : [0.6, 0.3];
  for (const q of room.rects) apartment.add(floor(q, m, tx, tz));
  roomFloors[room.id] = m;
}
{
  // Decke über Wohnung und Loggien: von oben unsichtbar, wirft aber Schatten
  const cm = mat(0xfbfaf7, { side: THREE.FrontSide }); cm.shadowSide = THREE.DoubleSide;
  for (const q of [...outline, ...loggias.flatMap((l) => l.rects)]) {
    const g = new THREE.PlaneGeometry(q.x1 - q.x0, q.z1 - q.z0); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, cm); m.position.set((q.x0 + q.x1) / 2, WALL_H, (q.z0 + q.z1) / 2);
    m.castShadow = true; apartment.add(m);
  }
}

// Wände über ein 5-cm-Raster: alles innerhalb der Kontur, das kein Raum, keine Öffnung und kein Treppenhaus ist
const CELL = 0.05;
const allRoomRects = rooms.flatMap((q) => q.rects);
const xMax = Math.max(...outline.map((q) => q.x1)), zMax = Math.max(...outline.map((q) => q.z1));
const nx = Math.ceil(xMax / CELL), nz = Math.ceil(zMax / CELL);
const typeAt = (x, z) => {
  if (!inAny(x, z, outline)) return 0;
  if (inAny(x, z, allRoomRects) || inAny(x, z, openings)) return 0;
  if (inAny(x, z, core)) return 3;
  if (inAny(x, z, windows)) return 2;
  return 1;
};
const cellType = (i, j) => typeAt((i + 0.5) * CELL, (j + 0.5) * CELL);
const runs = [];
let open = new Map();
for (let j = 0; j <= nz; j++) {
  const next = new Map();
  if (j < nz) {
    let i = 0;
    while (i < nx) {
      const t = cellType(i, j);
      if (!t) { i++; continue; }
      let k = i; while (k < nx && cellType(k, j) === t) k++;
      const key = `${i}:${k}:${t}`;
      const prev = open.get(key);
      if (prev) { prev.j1 = j + 1; next.set(key, prev); open.delete(key); }
      else next.set(key, { i0: i, i1: k, j0: j, j1: j + 1, t });
      i = k;
    }
  }
  for (const v of open.values()) runs.push(v);
  open = next;
}
const wallMat = mat(0xf6f3ee);
const capMat = mat(0x4a3a33);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbfdcea, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
const frameMat = mat(0x2b2726);
const walls = new THREE.Group();
for (const q of runs) {
  if (q.t !== 1) continue;
  const rect = { x0: q.i0 * CELL, x1: q.i1 * CELL, z0: q.j0 * CELL, z1: q.j1 * CELL };
  walls.add(box(rect, 0, WALL_H, [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]));
}
for (const wq of windows) {
  // auf die Wanddicke zuschneiden: Bereich des Rechtecks, der in der Kontur und in keinem Raum liegt
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let x = wq.x0; x < wq.x1; x += CELL) for (let z = wq.z0; z < wq.z1; z += CELL) {
    if (typeAt(x, z) === 2) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + CELL); z0 = Math.min(z0, z); z1 = Math.max(z1, z + CELL); }
  }
  if (x0 === Infinity) continue;
  const rect = { x0, x1, z0, z1 };
  walls.add(box(rect, WALL_H - 0.18, WALL_H, [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]));
  const w = x1 - x0, d = z1 - z0, alongX = w > d;
  const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const thin = alongX ? { ...rect, z0: mid - 0.02, z1: mid + 0.02 } : { ...rect, x0: mid - 0.02, x1: mid + 0.02 };
  const g = box(thin, 0, WALL_H - 0.18, glassMat); g.castShadow = false; g.receiveShadow = false; walls.add(g);
  const fr = alongX ? { ...rect, z0: mid - 0.04, z1: mid + 0.04 } : { ...rect, x0: mid - 0.04, x1: mid + 0.04 };
  walls.add(box(fr, 0, 0.06, frameMat), box(fr, WALL_H - 0.24, WALL_H - 0.18, frameMat));
  const len = alongX ? w : d, n = Math.max(2, Math.round(len / 1.4) + 1);
  for (let k = 0; k < n; k++) {
    const a = (alongX ? x0 : z0) + (len - 0.06) * k / (n - 1);
    const post = alongX ? { x0: a, x1: a + 0.06, z0: mid - 0.04, z1: mid + 0.04 } : { x0: mid - 0.04, x1: mid + 0.04, z0: a, z1: a + 0.06 };
    walls.add(box(post, 0, WALL_H - 0.18, frameMat));
  }
}
apartment.add(walls);

// Treppenhaus, Hauseingang und Lift (allgemeine Flächen)
const coreMat = mat(0xcfc9c0, { transparent: true, opacity: 1 });
const rest = new THREE.Group();
for (const q of core) rest.add(box(q, 0, WALL_H, coreMat));
scene.add(rest);
const restA = rest.clone(); restA.position.x = HOUSE_A_DX; scene.add(restA);

// Loggien: Stützen an den Ecken und Pflanztröge
{
  const pillar = mat(0xe9e6df);
  const posts = [[mx(31), mz(548)], [mx(31), mz(1056)], [mx(563), mz(1056)], [mx(1052), mz(548)], [mx(1052), mz(833)], [mx(840), mz(833)]];
  for (const [x, z] of posts) apartment.add(box({ x0: x - 0.12, x1: x + 0.12, z0: z - 0.12, z1: z + 0.12 }, 0, WALL_H, pillar));
  const trough = mat(0xb8b2a8), green = mat(0x6d8c5c, { flatShading: true });
  for (const q of [r(52, 74, 640, 740), r(52, 74, 860, 940), r(860, 1036, 805, 826)]) {
    apartment.add(box(q, 0, 0.45, trough));
    apartment.add(box({ x0: q.x0 + 0.03, x1: q.x1 - 0.03, z0: q.z0 + 0.03, z1: q.z1 - 0.03 }, 0.45, 0.75, green));
  }
}

// ---------- Küche, Bäder, Möbel ----------
const furn = new THREE.Group();      // lose Möblierung (ausblendbar)
const fitout = new THREE.Group();    // Küche und Nasszellen gemäss Farbstimmung
furn.name = 'furn';
apartment.add(furn, fitout);
const white = mat(0xfafafa, { roughness: 0.2 });
const steel = mat(0xb8bcc0, { roughness: 0.3, metalness: 0.7 });
const dark = mat(0x1d1f21, { roughness: 0.3 });
const mirror = mat(0xd4e3ea, { roughness: 0.08, metalness: 0.15 });
{
  const front = useMat('front'), stone = useMat('stone');
  const plinth = mat(0x6f665c), gap = mat(0x5e554c), glass = mat(0x14161a, { roughness: 0.12, metalness: 0.4 });
  // Küchenzeile an der Nordwand: Hochschränke an beiden Enden, Unterschränke mit Spüle, Oberschränke, Glasrückwand
  const k = kitchen.row, zB = k.z0, zF = k.z0 + 0.62;
  const t0 = k.x0 + 0.6, t1 = k.x1 - 0.6;
  part(fitout, k.x0, k.x1, zB, zF - 0.05, 0, 0.1, plinth);
  part(fitout, k.x0, t0, zB, zF, 0.1, 2.2, front);
  part(fitout, t1, k.x1, zB, zF, 0.1, 2.2, front);
  part(fitout, t0, t1, zB, zF, 0.1, 0.88, front);
  part(fitout, t0, t1, zB, zF + 0.02, 0.88, 0.91, stone);
  part(fitout, t0, t1, zB, zB + 0.01, 0.91, 1.5, mat(0xe8e2d6, { roughness: 0.1, metalness: 0.1 }));   // Glasrückwand
  part(fitout, t0, t1, zB, zB + 0.35, 1.5, 2.2, front);
  const n = Math.round((t1 - t0) / 0.6);
  for (let i = 1; i < n; i++) { const x = t0 + i * (t1 - t0) / n; part(fitout, x - 0.002, x + 0.002, zF, zF + 0.003, 0.1, 0.88, gap); }
  part(fitout, t0 - 0.002, t0 + 0.002, zF, zF + 0.003, 0.1, 2.2, gap);
  part(fitout, t1 - 0.002, t1 + 0.002, zF, zF + 0.003, 0.1, 2.2, gap);
  part(fitout, k.x0 + 0.1, t0 - 0.1, zF, zF + 0.012, 0.95, 1.4, glass);                                 // Kombibackofen
  const sx = (t0 + t1) / 2;
  part(fitout, sx - 0.25, sx + 0.25, zB + 0.1, zB + 0.5, 0.905, 0.912, mat(0x8e9499, { metalness: 0.8, roughness: 0.35 }));
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 16), steel); tap.position.set(sx, 1.06, zB + 0.07); fitout.add(tap);
  // Kochinsel mit Glaskeramikkochfeld und Dunstabzug
  const isl = kitchen.island;
  part(fitout, isl.x0 + 0.05, isl.x1 - 0.05, isl.z0 + 0.05, isl.z1 - 0.05, 0, 0.1, plinth);
  part(fitout, isl.x0, isl.x1, isl.z0, isl.z1, 0.1, 0.88, front);
  part(fitout, isl.x0 - 0.02, isl.x1 + 0.02, isl.z0 - 0.02, isl.z1 + 0.02, 0.88, 0.91, stone);
  const hx = isl.x0 + (isl.x1 - isl.x0) * 0.45;
  part(fitout, hx - 0.4, hx + 0.4, isl.z0 + 0.12, isl.z1 - 0.12, 0.911, 0.915, glass);
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.13, 0.13]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.09, 32), mat(0x6a6e73)); ring.rotation.x = -Math.PI / 2;
    ring.position.set(hx + dx, 0.917, (isl.z0 + isl.z1) / 2 + dz); fitout.add(ring);
  }
  part(fitout, hx - 0.3, hx + 0.3, (isl.z0 + isl.z1) / 2 - 0.25, (isl.z0 + isl.z1) / 2 + 0.25, 2.15, WALL_H, mat(0x2b2b2b));   // Dunstabzug
  // Bad: Badewanne, Dusche mit Glastrennwand, Lavabo mit Spiegelschrank, WC, Handtuchradiator
  const tub = r(757, 825, 60, 160);
  fitout.add(box(tub, 0, 0.56, white));
  fitout.add(box({ x0: tub.x0 + 0.08, x1: tub.x1 - 0.08, z0: tub.z0 + 0.08, z1: tub.z1 - 0.08 }, 0.5, 0.565, mat(0xe9eef0, { roughness: 0.1 })));
  fitout.add(box(r(690, 734, 57, 80), 0.45, 0.85, white));
  fitout.add(box(r(690, 734, 56, 60), 1.15, 1.85, mirror));
  fitout.add(box(r(628, 654, 57, 92), 0.2, 0.42, white));
  const sg1 = box(r(610, 614, 57, 128), 0, 2.0, glassMat); sg1.castShadow = false; fitout.add(sg1);
  fitout.add(box(r(553, 557, 80, 100), 0.9, 2.1, steel));
  fitout.add(box(r(742, 750, 120, 158), 0.3, 1.2, white));
  // Dusche
  fitout.add(box(r(690, 728, 445, 468), 0.45, 0.85, white));
  fitout.add(box(r(690, 728, 444, 448), 1.15, 1.85, mirror));
  fitout.add(box(r(630, 656, 445, 480), 0.2, 0.42, white));
  const sg2 = box(r(610, 614, 445, 515), 0, 2.0, glassMat); sg2.castShadow = false; fitout.add(sg2);
  fitout.add(box(r(554, 558, 470, 490), 0.9, 2.1, steel));
}
// Waschturm Schulthess im Reduit WM/TU
{
  const w = washTower, body = mat(0xf4f4f2, { roughness: 0.35 });
  part(fitout, w.x0, w.x1, w.z0, w.z1, 0, 0.849, body);
  part(fitout, w.x0, w.x1, w.z0, w.z1, 0.851, 1.7, body);
  const xc = (w.x0 + w.x1) / 2;
  for (const y of [0.4, 1.25]) {
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 28), dark);
    door.rotation.x = Math.PI / 2; door.position.set(xc, y, w.z1 + 0.015); fitout.add(door);
  }
}
const gardMat = useMat('gard');
for (const q of furniture) furn.add(box(q, q.y, q.y + q.h, q.color === 'gard' ? gardMat : mat(q.color)));
function table(group, q, topMat, legMat, h = 0.75) {
  part(group, q.x0, q.x1, q.z0, q.z1, h - 0.045, h, topMat);
  const i = 0.07, w = 0.07;
  for (const x of [q.x0 + i, q.x1 - i - w]) for (const z of [q.z0 + i, q.z1 - i - w]) part(group, x, x + w, z, z + w, 0, h - 0.045, legMat);
}
// dir: Richtung, in die der Stuhl schaut ('n' = nach -z, 's' = +z, 'w' = -x, 'e' = +x)
function chair(group, cx, cz, dir, seatMat, frameMat) {
  const s = 0.45, hs = s / 2, t = 0.04;
  part(group, cx - hs, cx + hs, cz - hs, cz + hs, 0.42, 0.46, seatMat);
  for (const dx of [-hs, hs - t]) for (const dz of [-hs, hs - t]) part(group, cx + dx, cx + dx + t, cz + dz, cz + dz + t, 0, 0.42, frameMat);
  const b = { n: [cx - hs, cx + hs, cz + hs - t, cz + hs], s: [cx - hs, cx + hs, cz - hs, cz - hs + t],
    w: [cx + hs - t, cx + hs, cz - hs, cz + hs], e: [cx - hs, cx - hs + t, cz - hs, cz + hs] }[dir];
  part(group, b[0], b[1], b[2], b[3], 0.46, 0.88, seatMat);
}
// Bett: q = Aussenmass Rahmen, head = Wand am Kopfende ('n','s','w','e')
function bed(q, head, duvet) {
  const W = head === 'w' || head === 'e' ? q.z1 - q.z0 : q.x1 - q.x0, L = head === 'w' || head === 'e' ? q.x1 - q.x0 : q.z1 - q.z0;
  const R = (u0, u1, v0, v1) => {
    if (head === 'w') return [q.x0 + u0, q.x0 + u1, q.z0 + v0, q.z0 + v1];
    if (head === 'e') return [q.x1 - u1, q.x1 - u0, q.z0 + v0, q.z0 + v1];
    if (head === 'n') return [q.x0 + v0, q.x0 + v1, q.z0 + u0, q.z0 + u1];
    return [q.x0 + v0, q.x0 + v1, q.z1 - u1, q.z1 - u0];
  };
  const frameMat = mat(0x9b8469);
  const P = (u0, u1, v0, v1, a, b, m) => { const c = R(u0, u1, v0, v1); return part(furn, c[0], c[1], c[2], c[3], a, b, m); };
  P(0.06, L - 0.06, 0.06, W - 0.06, 0, 0.12, mat(0x4a4038));
  P(0, L, 0, W, 0.12, 0.3, frameMat);
  P(0.05, L - 0.05, 0.05, W - 0.05, 0.3, 0.5, mat(0xf7f5f0));
  P(0, 0.06, 0, W, 0.12, 1.0, frameMat);
  const n = W > 1.4 ? 2 : 1, pw = n === 2 ? (W - 0.3) / 2 : W - 0.3;
  for (let i = 0; i < n; i++) P(0.12, 0.52, 0.1 + i * (pw + 0.1), 0.1 + i * (pw + 0.1) + pw, 0.5, 0.6, mat(0xffffff));
  P(0.62, L - 0.04, 0.03, W - 0.03, 0.5, 0.57, mat(duvet));
}
{
  const woodM = mat(0xb39468, { roughness: 0.6 }), dk = mat(0x4a4038), seat = mat(0x8f8478), wh = mat(0xf4f2ee);
  for (const b of beds) bed(b, b.head, b.duvet);
  // Nachttische Zimmer Nord
  const bn = beds[0];
  for (const x of [bn.x0 - 0.5, bn.x1 + 0.05]) {
    part(furn, x, x + 0.45, bn.z0, bn.z0 + 0.42, 0, 0.5, woodM);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 16), wh); lamp.position.set(x + 0.225, 0.68, bn.z0 + 0.2); furn.add(lamp);
  }
  // Pult mit Bildschirm und Stuhl im Zimmer Ost
  table(furn, desk, woodM, dk, 0.74);
  const dcx = (desk.x0 + desk.x1) / 2;
  part(furn, dcx - 0.3, dcx + 0.3, desk.z0 + 0.06, desk.z0 + 0.09, 0.85, 1.2, mat(0x1a1c1f, { roughness: 0.2 }));
  chair(furn, dcx, desk.z1 + 0.3, 'n', mat(0x3d4247), dk);
  // Esstisch mit sechs Stühlen
  const wood = mat(0xa9824f, { roughness: 0.6 }), frame = mat(0x4a4038);
  table(furn, diningTable, wood, mat(0x8a6a40));
  const len = diningTable.x1 - diningTable.x0;
  for (const k of [0.2, 0.5, 0.8]) {
    const x = diningTable.x0 + len * k;
    chair(furn, x, diningTable.z0 - 0.15, 's', seat, frame);
    chair(furn, x, diningTable.z1 + 0.15, 'n', seat, frame);
  }
  // Barhocker an der Kochinsel
  for (const k of [0.25, 0.75]) {
    const x = kitchen.island.x0 + (kitchen.island.x1 - kitchen.island.x0) * k;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 20), seat); st.position.set(x, 0.68, kitchen.island.z1 + 0.32);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 8), dk); leg.position.set(x, 0.33, kitchen.island.z1 + 0.32);
    st.castShadow = leg.castShadow = true; furn.add(st, leg);
  }
  // Grosse Loggia: Lounge mit Outdoor-Sofa und runder Esstisch mit vier Stühlen
  const teak = mat(0xb98d5c, { roughness: 0.75 }), cushion = mat(0xe7e0d2);
  part(furn, mx(80), mx(205), mz(566), mz(610), 0, 0.42, cushion);
  part(furn, mx(80), mx(205), mz(560), mz(570), 0, 0.78, teak);
  part(furn, mx(110), mx(176), mz(640), mz(700), 0, 0.35, teak);
  const lt = loggiaTable;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(lt.r, lt.r, 0.04, 40), teak); top.position.set(lt.cx, 0.74, lt.cz);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.72, 12), mat(0x55585b)); stem.position.set(lt.cx, 0.36, lt.cz);
  top.castShadow = stem.castShadow = true; furn.add(top, stem);
  chair(furn, lt.cx, lt.cz - 0.9, 's', teak, teak); chair(furn, lt.cx, lt.cz + 0.9, 'n', teak, teak);
  chair(furn, lt.cx - 0.9, lt.cz, 'e', teak, teak); chair(furn, lt.cx + 0.9, lt.cz, 'w', teak, teak);
  // Loggia: Liegestühle über Eck, Loggia Ost: zwei Sessel
  for (const q of [r(160, 214, 730, 780), r(400, 452, 960, 1012), r(905, 960, 590, 645), r(915, 970, 720, 775)]) {
    part(furn, q.x0, q.x1, q.z0, q.z1, 0, 0.4, cushion);
    part(furn, q.x0, q.x1, q.z0, q.z0 + 0.08, 0.4, 0.8, cushion);
  }
}

// ---------- Obergeschoss, Attika und Dach von Haus B (abhebbar) sowie Haus A ----------
const FACADE = 0x93a19a;        // Verputz in Salbeigrau gemäss Visualisierung
const upper = new THREE.Group();
const upperMats = [];
const um = (color, o = {}) => { const m = mat(color, { transparent: true, ...o }); upperMats.push(m); return m; };
const rTex = renderTex.clone(); rTex.repeat.set(6, 2);
const facadeB = um(FACADE, { map: rTex }), slabB = um(0xe7e3db), winB = um(0x22292c, { roughness: 0.15 }), railB = um(0xa8c4cc, { opacity: 0.35, roughness: 0.05 });
const roofB = um(0x9aa58a), parapetB = um(0xdedad2);
const pvMat = mat(0x10203c, { roughness: 0.2, metalness: 0.4 });
const SLAB = 0.3, STOREY = 2.8, Y_OG = WALL_H + SLAB, Y_AT = Y_OG + STOREY, Y_ROOF = Y_AT + STOREY;
// Rücksprünge der Loggien im Obergeschoss (vereinfacht)
const ogCut = [{ x0: mx(250), x1: mx(563), z0: mz(920), z1: HOUSE_D }, { x0: mx(843), x1: HOUSE_W, z0: mz(620), z1: mz(833) }];
const W0 = 0, E0 = HOUSE_W, N1 = mz(40), N2 = mz(268), S1 = mz(833), S2 = HOUSE_D, XS = mx(563), XN = mx(331);
// Fensterbänder an den Fassaden: [Fassade, Lage entlang, Breite]
const facadeWins = [
  ['w', 5.4, 1.8], ['w', 9.2, 1.8], ['w', 13.4, 1.6], ['n2', 1.3, 2.2], ['n1', 7.2, 1.5], ['n1', 10.6, 1.4], ['n1', 14.6, 1.8],
  ['e', 1.7, 1.6], ['e', 5.6, 1.8], ['e', 9.0, 1.8], ['s2', 1.2, 2.0], ['s1', 10.4, 2.4], ['s1', 13.6, 1.4],
];
function winPanel(face, a, w, y, h, m) {
  const t = 0.06;
  if (face === 'w') return box({ x0: W0 - t, x1: W0 + 0.02, z0: a, z1: a + w }, y, y + h, m);
  if (face === 'e') return box({ x0: E0 - 0.02, x1: E0 + t, z0: a, z1: a + w }, y, y + h, m);
  if (face === 'n1') return box({ x0: a, x1: a + w, z0: N1 - t, z1: N1 + 0.02 }, y, y + h, m);
  if (face === 'n2') return box({ x0: a, x1: a + w, z0: N2 - t, z1: N2 + 0.02 }, y, y + h, m);
  if (face === 's1') return box({ x0: a, x1: a + w, z0: S1 - 0.02, z1: S1 + t }, y, y + h, m);
  return box({ x0: a, x1: a + w, z0: S2 - 0.02, z1: S2 + t }, y, y + h, m);
}
// Volumen aus Rechtecken ohne die ausgesparten Bereiche (Rasterung in 25 cm, zusammengefasst pro Reihe)
function solid(rects, cuts, y0, y1, m, target, dx = 0) {
  const st = 0.25;
  for (const q of rects) {
    for (let z = q.z0; z < q.z1 - 1e-6; z += st) {
      const z1 = Math.min(q.z1, z + st);
      let x = q.x0;
      while (x < q.x1 - 1e-6) {
        const cut = (xx) => inAny(xx + 0.001, (z + z1) / 2, cuts);
        if (cut(x)) { x += st; continue; }
        let x1 = x; while (x1 < q.x1 - 1e-6 && !cut(x1)) x1 = Math.min(q.x1, x1 + st);
        target.add(box({ x0: x + dx, x1: x1 + dx, z0: z, z1 }, y0, y1, m));
        x = x1;
      }
    }
  }
}
function building(target, dx, mats, withEG, withPV) {
  const [fac, slab, win, rail, roof, parapet] = mats;
  const add = (o) => { o.position.x += dx; target.add(o); return o; };
  if (withEG) {
    solid(houseFoot, [], 0, WALL_H, fac, target, dx);
    for (const [face, a, w] of facadeWins) add(winPanel(face, a, w, 0.05, 2.2, win));
  }
  // Decke über EG inkl. Loggien
  for (const q of houseFoot) add(box(q, WALL_H, Y_OG, slab));
  // Obergeschoss
  solid(houseFoot, ogCut, Y_OG, Y_AT - SLAB, fac, target, dx);
  for (const [face, a, w] of facadeWins) add(winPanel(face, a, w, Y_OG + 0.05, 2.2, win));
  for (const q of ogCut) {
    // Verglasung hinten in der Loggia und Glasbrüstung
    const back = q.z1 === HOUSE_D ? { x0: q.x0, x1: q.x1, z0: q.z0, z1: q.z0 + 0.06 } : { x0: q.x0, x1: q.x0 + 0.06, z0: q.z0, z1: q.z1 };
    add(box(back, Y_OG, Y_AT - SLAB, win));
    const front = q.z1 === HOUSE_D ? { x0: q.x0, x1: q.x1, z0: q.z1 - 0.04, z1: q.z1 } : { x0: q.x1 - 0.04, x1: q.x1, z0: q.z0, z1: q.z1 };
    add(box(front, Y_OG, Y_OG + 1.0, rail));
  }
  for (const q of houseFoot) add(box(q, Y_AT - SLAB, Y_AT, slab));
  // Attika: zurückversetzt, Terrassen mit Glasgeländer
  solid(attikaFoot, [], Y_AT, Y_ROOF - SLAB, fac, target, dx);
  const aw = [['n1', 7.2, 1.5], ['n1', 10.6, 1.4], ['n1', 14.6, 1.8], ['e', 1.7, 1.6], ['e', 5.6, 1.8]];
  for (const [face, a, w] of aw) add(winPanel(face, a, w, Y_AT + 0.05, 2.2, win));
  add(box({ x0: mx(240), x1: mx(250), z0: mz(560), z1: mz(890) }, Y_AT, Y_ROOF - SLAB - 0.2, win));
  add(box({ x0: mx(570), x1: mx(830), z0: mz(828), z1: mz(836) }, Y_AT, Y_ROOF - SLAB - 0.2, win));
  add(box({ x0: mx(836), x1: mx(846), z0: mz(560), z1: mz(820) }, Y_AT, Y_ROOF - SLAB - 0.2, win));
  const railH = 1.05, t = 0.04;
  add(box({ x0: W0, x1: W0 + t, z0: N2, z1: S2 }, Y_AT, Y_AT + railH, rail));
  add(box({ x0: W0, x1: XS, z0: S2 - t, z1: S2 }, Y_AT, Y_AT + railH, rail));
  add(box({ x0: XS - t, x1: XS, z0: S1, z1: S2 }, Y_AT, Y_AT + railH, rail));
  add(box({ x0: XS, x1: E0, z0: S1 - t, z1: S1 }, Y_AT, Y_AT + railH, rail));
  add(box({ x0: E0 - t, x1: E0, z0: N2, z1: S1 }, Y_AT, Y_AT + railH, rail));
  add(box({ x0: W0, x1: XN, z0: N2, z1: N2 + t }, Y_AT, Y_AT + railH, rail));
  // Flachdach extensiv begrünt mit Brüstung
  for (const q of attikaFoot) add(box(q, Y_ROOF - SLAB, Y_ROOF, roof));
  const P = 0.25;
  add(box({ x0: mx(47), x1: mx(47) + P, z0: N2, z1: mz(548) }, Y_ROOF, Y_ROOF + 0.35, parapet));
  add(box({ x0: XN, x1: mx(1040), z0: N1, z1: N1 + P }, Y_ROOF, Y_ROOF + 0.35, parapet));
  add(box({ x0: mx(1040) - P, x1: mx(1040), z0: N1, z1: mz(830) }, Y_ROOF, Y_ROOF + 0.35, parapet));
  if (withPV) {
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const p = box({ x0: 6.2 + j * 2.1, x1: 8.1 + j * 2.1, z0: 4.6 + i * 1.15, z1: 5.6 + i * 1.15 }, Y_ROOF + 0.15, Y_ROOF + 0.35, pvMat);
      p.rotation.x = -0.18; add(p);
    }
  }
}
building(upper, 0, [facadeB, slabB, winB, railB, roofB, parapetB], false, false);
scene.add(upper);
// Haus A: Obergeschoss, Attika und Dach ebenfalls abhebbar, darunter die Wohnung A 001
const upperA = new THREE.Group();
building(upperA, HOUSE_A_DX, [facadeB, slabB, winB, railB, roofB, parapetB], false, true);
scene.add(upperA);
// Wohnung A 001: gleicher Grundriss wie B 001, als Kopie in Haus A
const apartmentA = apartment.clone();
apartmentA.position.x = HOUSE_A_DX;
scene.add(apartmentA);
{
  const orig = [], copy = [];
  apartment.traverse((o) => orig.push(o)); apartmentA.traverse((o) => copy.push(o));
  const targets = new Set(floorTargets);
  orig.forEach((o, i) => { if (targets.has(o)) floorTargets.push(copy[i]); });
}
const furnA = apartmentA.getObjectByName('furn');

// ---------- Nordpfeil ----------
{
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 3), mat(0x7a5a46));
  arrow.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(arrow);
  g.position.set(-5, 0.1, -1);
  g.lookAt(g.position.clone().add(NORTH));
  scene.add(g);
}

// ---------- Beschriftungen und Masse ----------
const labelLayer = document.getElementById('labels');
const labels = [];
const addLabel = (pos, html, cls = '') => {
  const el = document.createElement('div');
  el.className = 'label ' + cls; el.innerHTML = html; labelLayer.appendChild(el);
  const l = { pos, el, group: cls.split(' ').pop() }; labels.push(l); return l;
};
const centers = {};
for (const room of rooms) centers[room.id] = center(room);
// Pro Wohnung eigene Beschriftungen (nur die der gewählten Wohnung sind sichtbar)
const roomLabels = [];
for (const u of Object.values(units)) {
  const at = (x, y, z) => new THREE.Vector3(x + u.dx, y, z);
  for (const room of rooms) {
    const c = centers[room.id];
    const l = addLabel(at(c.x, 0.3, c.z), `<b>${room.name}</b><span>${areaOf(room, u).toFixed(1)} m²</span>`, 'room');
    l.id = room.id; l.unit = u.key; roomLabels.push(l);
    l.el.addEventListener('click', () => focusRoom(room.id));
  }
  for (const [x, z, html] of [[mx(140), mz(800), '<b>Loggia</b><span>41.5 m²</span>'], [mx(945), mz(700), '<b>Loggia Ost</b><span>15.7 m²</span>'],
    [14, 16.8, `<b>Garten</b><span>${u.garden.area} m²</span>`]]) addLabel(at(x, 0.2, z), html, 'out room').unit = u.key;
  addLabel(at(mx(540), WALL_H, mz(350)), '<b>Treppenhaus · Lift</b>', 'out room').unit = u.key;
  // Wohnungsname über dem Grundriss: bei der anderen Wohnung anklickbar zum Wechseln
  const t = addLabel(at(9, 3.2, 9), `<b>Wohnung ${u.name}</b><span>${u.preis} · Garten ${u.garden.area} m²</span>`, 'unitlbl');
  t.unitOf = u.key; t.el.addEventListener('click', () => setUnit(u.key));
}
addLabel(new THREE.Vector3(-5, 1.2, -1), '<b>N</b>', 'north');
addLabel(new THREE.Vector3(HOUSE_A_DX + 9, Y_ROOF + 1.6, 8), "<b>Haus A</b><span>PV auf dem Dach · Wohnung A 001 im Erdgeschoss</span>", 'building');
addLabel(new THREE.Vector3(9, Y_ROOF + 1.6, 8), '<b>Haus B</b><span>Wohnung B 001 im Erdgeschoss</span>', 'building');
addLabel(new THREE.Vector3(-6, 0.3, 23.5), '<b>Zufahrt Tiefgarage</b>', 'building');
addLabel(new THREE.Vector3(-15, 3, 23), '<b>Pergola</b>', 'building');
addLabel(new THREE.Vector3(10, 0.3, 23), '<b>Spielwiese</b>', 'building');
addLabel(new THREE.Vector3(3, 2.6, -6.3), '<b>Velounterstand</b>', 'building');

// Masslinien: dünner Strich am Boden mit Endmarken, Wert aus dem Modell (gerundet, ca.), pro Wohnung
const dims = new THREE.Group(); scene.add(dims);
const dimGroups = {};
const dimMat = new THREE.MeshBasicMaterial({ color: 0x2e2629 });
let dimUnit = units.B;
function dim(x0, z0, x1, z1, y = 0.035) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), t = 0.035, k = 0.14;
  const line = alongX ? { x0, x1, z0: z0 - t / 2, z1: z0 + t / 2 } : { x0: x0 - t / 2, x1: x0 + t / 2, z0, z1 };
  const mk = (q) => { const m = box(q, y, y + 0.012, dimMat); m.castShadow = m.receiveShadow = false; dimGroups[dimUnit.key].add(m); };
  mk(line);
  for (const e of [0, 1]) {
    const a = e ? (alongX ? x1 : z1) : (alongX ? x0 : z0);
    mk(alongX ? { x0: a - t / 2, x1: a + t / 2, z0: z0 - k, z1: z0 + k } : { x0: x0 - k, x1: x0 + k, z0: a - t / 2, z1: a + t / 2 });
  }
  addLabel(new THREE.Vector3((x0 + x1) / 2 + dimUnit.dx, y + 0.05, (z0 + z1) / 2), `${L.toFixed(1)} m`, 'dim').unit = dimUnit.key;
}
for (const u of Object.values(units)) {
  dimUnit = u;
  const g = new THREE.Group(); g.position.x = u.dx; dims.add(g); dimGroups[u.key] = g;
  const R = Object.fromEntries(rooms.map((q) => [q.id, q.rects[0]]));
  const both = (q, ox = 0.45, oz = 0.45) => { dim(q.x0, q.z1 - oz, q.x1, q.z1 - oz); dim(q.x0 + ox, q.z0, q.x0 + ox, q.z1); };
  both(R.zimmerW, 0.45, 0.6); both(R.zimmerN, 0.4, 0.75); both(R.zimmerO, 0.4, 0.75); both(R.wohnen, 0.3, 0.3);
  dim(R.kochen.x0, R.kochen.z0 + 1.6, R.kochen.x1, R.kochen.z0 + 1.6); dim(R.kochen.x0 + 0.3, R.kochen.z0, R.kochen.x0 + 0.3, R.essen.z1);
  dim(R.bad.x0, R.bad.z1 - 0.3, R.bad.x1, R.bad.z1 - 0.3);
  dim(R.dusche.x0, R.dusche.z1 - 0.3, R.dusche.x1, R.dusche.z1 - 0.3);
  // Aussenmasse Haus, Loggien, Garten
  dim(0, -0.8, HOUSE_W, -0.8); dim(HOUSE_W + 0.8, 0, HOUSE_W + 0.8, HOUSE_D);
  const [lw, ls] = loggias[0].rects, le = loggias[1].rects[0];
  dim(lw.x0, mz(1000), lw.x1, mz(1000)); dim(lw.x0 + 0.25, lw.z0, lw.x0 + 0.25, lw.z1); dim(ls.x0, ls.z1 - 0.25, ls.x1, ls.z1 - 0.25);
  dim(le.x0, le.z0 + 0.3, le.x1, le.z0 + 0.3); dim(le.x1 - 0.3, le.z0, le.x1 - 0.3, le.z1);
  const [gw, gs, gso, ge] = u.garden.rects;
  dim(gw.x0, 6, gw.x1, 6); dim(ge.x0, 6, ge.x1, 6); dim(16, gso.z0, 16, gso.z1); dim(gs.x0 + 2, gs.z0, gs.x0 + 2, gs.z1);
}
let dimsOn = true;

const v = new THREE.Vector3();
function updateLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of labels) {
    v.copy(l.pos); if (l.group === 'building' && l.pos.y > 5) v.y += ease(lift) * 26;
    const dist = v.distanceTo(camera.position);
    v.project(camera);
    const vis = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    let show = l.group === 'building' ? 1 - lift : l.group === 'north' ? (walking ? 0 : 1) : lift;
    if ((l.group === 'room' || l.group === 'building') && walking) show = 0;
    if (l.group === 'dim') show = dimsOn && dist < (walking ? 4.2 : 45) ? lift : 0;
    if (l.unit && l.unit !== unit.key) show = 0;
    if (l.group === 'unitlbl') show = walking || l.unitOf === unit.key ? 0 : lift;
    l.el.style.opacity = vis ? show : 0;
    l.el.style.pointerEvents = vis && show > 0.6 && (l.id || l.unitOf) ? 'auto' : 'none';
    l.el.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px)`;
    l.el.classList.toggle('active', !!l.id && l.id === activeRoom);
  }
}

// ---------- Zustand und Animation ----------
let lift = 0, liftTarget = 0;   // 0 = Gebäude geschlossen, 1 = Geschosse abgehoben
let activeRoom = null, token = 0, playing = false, walking = false;
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
const sleep = (ms, tk) => new Promise((res) => {
  const t0 = performance.now();
  const tick = () => (tk !== token ? res(false) : performance.now() - t0 >= ms ? res(true) : requestAnimationFrame(tick));
  tick();
});
function fly(pos, target, ms, tk) {
  const p0 = camera.position.clone(), t0v = controls.target.clone();
  const p1 = new THREE.Vector3(...pos), t1v = new THREE.Vector3(...target);
  const start = performance.now();
  return new Promise((res) => {
    const step = () => {
      if (tk !== token) return res(false);
      const k = Math.min(1, (performance.now() - start) / ms), e = ease(k);
      camera.position.lerpVectors(p0, p1, e);
      controls.target.lerpVectors(t0v, t1v, e);
      if (k < 1) requestAnimationFrame(step); else res(true);
    };
    step();
  });
}
const AC = () => [9.0 + unit.dx, 0, 9.2];
const overView = () => [-6 + unit.dx, 22, 28];
const roomCenter = (id) => centers[id].clone().setX(centers[id].x + unit.dx);
const roomView = (id) => {
  const c = roomCenter(id), narrow = innerWidth < 760;
  return [[c.x - 3.6, narrow ? 21 : 11.5, c.z + (narrow ? 11 : 8.2)], [c.x, 0.4, c.z]];
};
const caption = document.getElementById('caption');
function setCaption(title, text) {
  caption.innerHTML = title ? `<b>${title}</b>${text ? `<span>${text}</span>` : ''}` : '';
  caption.classList.toggle('show', !!title);
}
function setActive(id) {
  activeRoom = id;
  for (const [k, m] of Object.entries(roomFloors)) { m.emissive.setHex(k === id ? 0x7a5a46 : 0x000000); m.emissiveIntensity = 0.22; }
  document.querySelectorAll('.chip[data-id]').forEach((c) => c.classList.toggle('on', c.dataset.id === id));
}
const roomNote = (room) => (room.id === 'zimmerN' ? `Elternzimmer mit Einbauschrank, Bad nebenan (${unit.key === 'B' ? 'A 001: 13.0 m²' : 'B 001: 13.4 m²'})` : room.note);
async function focusRoom(id) {
  if (walking) { standIn(id); return; }
  stop();
  const tk = token; liftTarget = 1; setActive(id);
  const room = rooms.find((q) => q.id === id);
  setCaption(`${room.name} · ${areaOf(room).toFixed(1)} m²`, roomNote(room));
  const [p, t] = roomView(id);
  await fly(p, t, 1400, tk);
}
function stop() { token++; playing = false; playBtn.textContent = 'Tour starten'; }

async function tour() {
  if (walking) setWalk(false);
  token++; const tk = token; playing = true; playBtn.textContent = 'Tour anhalten';
  const far = innerWidth < 760 ? 1.45 : 1, dx = unit.dx;
  setActive(null); liftTarget = 0;
  setCaption('URSINIA, Wagerenstrasse 17, Uster', 'Zwei Mehrfamilienhäuser mit acht Eigentumswohnungen');
  if (!await fly([-40 * far, 24 * far, 58 * far], [-4, 3, 9], 1800, tk)) return;
  if (!await fly([-8 * far, 22 * far, 62 * far], [-4, 3, 9], 6000, tk)) return;
  setCaption('Zwei Gartenwohnungen im Erdgeschoss', "A 001 in Haus A (CHF 2'135'000, Garten 184 m²) und B 001 in Haus B (CHF 2'100'000, Garten 155 m²), gleicher Grundriss");
  liftTarget = 1;
  if (!await fly([-4, 46 * far, 30 * far], [-4, 0, 9], 4200, tk)) return;
  if (!await sleep(2600, tk)) return;
  setCaption(`Wohnung ${unit.name} im Erdgeschoss von ${unit.haus}`, `4.5 Zimmer, ${unit.bwf} BWF, Loggien 41.5 und 15.7 m², Garten ${unit.garden.area} m²`);
  if (!await fly(overView(), AC(), 3000, tk)) return;
  if (!await sleep(900, tk)) return;
  if (!await fly([AC()[0], 30 * far, AC()[2] + 0.01], AC(), 2600, tk)) return;
  if (!await sleep(1800, tk)) return;
  for (const room of rooms) {
    setActive(room.id);
    setCaption(`${room.name} · ${areaOf(room).toFixed(1)} m²`, roomNote(room));
    const [p, t] = roomView(room.id);
    if (!await fly(p, t, 1900, tk)) return;
    if (!await sleep(1700, tk)) return;
  }
  setActive(null);
  setCaption(`Loggia 41.5 m² und Garten ${unit.garden.area} m²`, `Grosse Loggia über Eck vor Kochen und Essen. ${unit.lage}`);
  if (!await fly([-12 * far + dx, 9 * far, 26 * far], [4 + dx, 0, 14], 2800, tk)) return;
  if (!await sleep(2600, tk)) return;
  setCaption(unit.preis, 'Oben rechts zwischen A 001 und B 001 wechseln, frei zoomen oder mit «Begehen» durch die Wohnung laufen');
  if (!await fly(overView(), AC(), 2600, tk)) return;
  playing = false; playBtn.textContent = 'Tour nochmals';
}

// ---------- Wohnung wechseln ----------
function setUnit(key) {
  const changed = unit.key !== key;
  unit = units[key];
  document.querySelectorAll('.chip.unit').forEach((b) => b.classList.toggle('on', b.dataset.u === key));
  document.getElementById('unitTitle').textContent = `Wohnung ${unit.name}`;
  document.getElementById('unitSub').textContent = `4.5 Zimmer · Erdgeschoss ${unit.haus} · Garten · Neubau`;
  document.getElementById('kPreis').textContent = unit.preis;
  document.getElementById('kBwf').textContent = unit.bwf;
  document.getElementById('kGarten').textContent = `${unit.garden.area} m²`;
  document.title = `Wohnung ${unit.name} · URSINIA, Wagerenstrasse 17, Uster · 3D`;
  document.querySelectorAll('.chip[data-id]').forEach((c) => {
    const room = rooms.find((q) => q.id === c.dataset.id);
    c.innerHTML = `${room.name}<i>${areaOf(room).toFixed(1)}</i>`;
  });
  for (const [k, g] of Object.entries(dimGroups)) g.visible = k === key;
  if (!changed) return;
  if (walking) { standIn('wohnen'); caption.dataset.w = ''; return; }
  stop(); liftTarget = 1; setActive(null);
  setCaption(`Wohnung ${unit.name} im Erdgeschoss von ${unit.haus}`, `${unit.preis} · ${unit.bwf} BWF · Garten ${unit.garden.area} m² · ${unit.keller}`);
  fly(overView(), AC(), 1600, token);
}

// ---------- Begehen (Ich-Perspektive) ----------
const EYE = 1.62;
const LOOK = { wohnen: [-1, 0.35], kochen: [0.2, 1], essen: [-1, 0.6], zimmerW: [-1, -0.2], zimmerN: [0.2, -1], zimmerO: [0.6, 1],
  entree: [0.3, 1], korridor: [0, 1], bad: [-1, 0], dusche: [-1, 0.2], reduit: [-1, 0], wmtu: [0, -1] };
function standIn(id) {
  const c = roomCenter(id), q = rooms.find((x) => x.id === id).rects[0], [dx, dz] = LOOK[id], n = Math.hypot(dx, dz);
  let k = 0.32;
  for (; k > 0; k -= 0.08) {
    const x = c.x - dx / n * (q.x1 - q.x0) * k, z = c.z - dz / n * (q.z1 - q.z0) * k;
    if (!blocked(x, z)) { camera.position.set(x, EYE, z); break; }
  }
  if (k <= 0) camera.position.set(c.x, EYE, c.z);
  yaw = Math.atan2(dx, -dz); pitch = -0.12; walkTarget = null;
}
let yaw = 0, pitch = 0, walkTarget = null, teleport = false;
const keys = new Set();
const loggiaRects = loggias.flatMap((l) => l.rects);
// Weltkoordinaten -> Koordinaten der gewählten Wohnung
function blockedPoint(wx, z) {
  const x = wx - unit.dx;
  if (inAny(x, z, outline)) { const t = typeAt(x, z); return t === 1 || t === 3 || (t === 2 && !inAny(x, z, passable)); }
  return !inAny(x, z, loggiaRects) && !inAny(x, z, unit.garden.rects);
}
function blocked(x, z) {
  const rr = 0.22;
  return blockedPoint(x + rr, z) || blockedPoint(x - rr, z) || blockedPoint(x, z + rr) || blockedPoint(x, z - rr);
}
function tryMove(dx, dz) {
  const p = camera.position;
  if (!blocked(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return true; }
  if (!blocked(p.x + dx, p.z)) { p.x += dx; return true; }
  if (!blocked(p.x, p.z + dz)) { p.z += dz; return true; }
  return false;
}
function setWalk(on) {
  if (on === walking) return;
  stop(); walking = on; controls.enabled = !on;
  walkBtn.classList.toggle('active', on); walkBtn.textContent = on ? 'Begehen beenden' : 'Begehen';
  if (on) {
    liftTarget = 1; setActive(null);
    standIn('wohnen'); camera.fov = 68; camera.updateProjectionMatrix();
    caption.dataset.w = '';
  } else {
    camera.fov = 42; camera.updateProjectionMatrix(); walkTarget = null;
    camera.position.set(...overView()); controls.target.set(...AC());
    setCaption(`Wohnung ${unit.name} im Erdgeschoss`, '');
  }
  hint.classList.toggle('show', on);
}
function placeName(wx, z) {
  const x = wx - unit.dx;
  const here = rooms.find((q) => inAny(x, z, q.rects));
  if (here) return [`${here.name} · ${areaOf(here).toFixed(1)} m²`, roomNote(here)];
  const lg = loggias.find((l) => inAny(x, z, l.rects));
  if (lg) return [`${lg.name} · ${lg.area.toFixed(1)} m²`, 'Feinsteinzeug 60 x 60, elektrische Senkrechtmarkisen'];
  return [`Garten ${unit.name} · ${unit.garden.area} m²`, 'Gartenanteil mit Wildhecke'];
}
let down = null;
const ray = new THREE.Raycaster();
canvas.addEventListener('pointerdown', (e) => { if (playing) stop(); down = { x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener('pointermove', (e) => {
  if (!down || !walking) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  down.moved += Math.abs(dx) + Math.abs(dy); down.x = e.clientX; down.y = e.clientY;
  yaw -= dx * 0.0042; pitch = THREE.MathUtils.clamp(pitch + dy * 0.0042, -1.2, 1.2);
});
addEventListener('pointerup', (e) => {
  if (down && walking && down.moved < 7) {
    const b = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(floorTargets, false)[0];
    if (hit) { walkTarget = hit.point.clone(); teleport = false; }
  }
  down = null;
});
canvas.addEventListener('wheel', (e) => {
  if (playing) stop();
  if (!walking) return;
  e.preventDefault();
  const s = THREE.MathUtils.clamp(-e.deltaY * 0.004, -0.6, 0.6); walkTarget = null;
  tryMove(Math.sin(yaw) * s, -Math.cos(yaw) * s);
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setWalk(false);
  if (walking && !e.metaKey && !e.ctrlKey) { keys.add(e.key.toLowerCase()); if (e.key.startsWith('Arrow')) e.preventDefault(); }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
function walkStep(dt) {
  const fx = Math.sin(yaw), fz = -Math.cos(yaw); // Blickrichtung in der Ebene
  let mf = 0, ms = 0, turn = 0;
  if (keys.has('w') || keys.has('arrowup')) mf += 1;
  if (keys.has('s') || keys.has('arrowdown')) mf -= 1;
  if (keys.has('d')) ms += 1;
  if (keys.has('a')) ms -= 1;
  if (keys.has('arrowleft')) turn -= 1;
  if (keys.has('arrowright')) turn += 1;
  yaw += turn * dt * 1.8;
  if (mf || ms) {
    walkTarget = null; const sp = 2.4 * dt;
    tryMove((fx * mf - fz * ms) * sp, (fz * mf + fx * ms) * sp);
  }
  if (walkTarget) {
    const p = camera.position, dx = walkTarget.x - p.x, dz = walkTarget.z - p.z, d = Math.hypot(dx, dz);
    if (teleport) { p.x = walkTarget.x; p.z = walkTarget.z; walkTarget = null; }
    else if (d < 0.08) walkTarget = null;
    else { const sp = Math.min(d, 3.2 * dt); if (!tryMove(dx / d * sp, dz / d * sp)) walkTarget = null; }
  }
  camera.position.y = EYE;
  camera.rotation.set(pitch, -yaw, 0, 'YXZ');
  const [name, note] = placeName(camera.position.x, camera.position.z);
  if (caption.dataset.w !== name) { caption.dataset.w = name; setCaption(name, note); }
}

// ---------- Bedienung ----------
const hint = document.getElementById('hint');
const playBtn = document.getElementById('play');
playBtn.addEventListener('click', () => (playing ? stop() : tour()));
const walkBtn = document.getElementById('walk');
walkBtn.addEventListener('click', () => setWalk(!walking));
const bldBtn = document.getElementById('building');
bldBtn.addEventListener('click', () => { if (walking) setWalk(false); stop(); liftTarget = liftTarget > 0.5 ? 0 : 1; });
const furnBtn = document.getElementById('furn');
furnBtn.addEventListener('click', () => { furn.visible = !furn.visible; if (furnA) furnA.visible = furn.visible; furnBtn.classList.toggle('off', !furn.visible); });
const dimBtn = document.getElementById('dims');
dimBtn.addEventListener('click', () => { dimsOn = !dimsOn; dims.visible = dimsOn; dimBtn.classList.toggle('off', !dimsOn); });
const sunInfo = document.getElementById('sunInfo'), monthSel = document.getElementById('month');
monthSel.innerHTML = MONTHS.map((m, i) => `<option value="${i}"${i === 6 ? ' selected' : ''}>15. ${m[0]}</option>`).join('');
monthSel.addEventListener('change', () => { setMonth(+monthSel.value); sunHour = THREE.MathUtils.clamp(sunHour, SUNRISE + 0.3, SUNSET - 0.3); sunInput.value = sunHour; applySun(); });
const sunLabel = document.getElementById('sunLabel'), sunInput = document.getElementById('sun'), sunPlay = document.getElementById('sunPlay');
let sunRun = false;
sunInput.addEventListener('input', () => { sunHour = +sunInput.value; applySun(); });
sunPlay.addEventListener('click', () => { sunRun = !sunRun; sunPlay.textContent = sunRun ? 'Pause' : 'Tagesverlauf'; });

const chips = document.getElementById('chips');
for (const room of rooms) {
  const b = document.createElement('button');
  b.className = 'chip'; b.dataset.id = room.id;
  b.innerHTML = `${room.name}<i>${room.area.toFixed(1)}</i>`;
  b.addEventListener('click', () => focusRoom(room.id));
  chips.appendChild(b);
}
const linien = document.getElementById('linien');
ausbaulinien.forEach((l, i) => {
  const b = document.createElement('button'); b.className = 'chip linie'; b.textContent = l.name;
  b.addEventListener('click', () => applyLinie(i)); linien.appendChild(b);
});
const groups = document.getElementById('groups');
groups.innerHTML = facts.gruppen.map((g, i) => `
  <details ${i < 1 ? 'open' : ''}><summary>${g.titel}</summary>
  <dl>${g.zeilen.map(([k, w]) => `<div><dt>${k}</dt><dd>${w}</dd></div>`).join('')}</dl></details>`).join('');
const panel = document.getElementById('panel');
document.getElementById('toggle').addEventListener('click', () => panel.classList.toggle('open'));

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
applyLinie(0);
document.querySelectorAll('.chip.unit').forEach((b) => b.addEventListener('click', () => setUnit(b.dataset.u)));
setUnit(new URLSearchParams(location.search).get('w') === 'A' ? 'A' : 'B');
applySun();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  lift += (liftTarget - lift) * Math.min(1, dt * 2.2);
  upper.position.y = upperA.position.y = ease(lift) * 26;
  upper.visible = upperA.visible = lift < 0.58;
  for (const m of upperMats) {
    const o = Math.max(0, 1 - lift * 1.7);
    m.opacity = m === railB ? 0.35 * o : o;
    const tr = m === railB || o < 0.999;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
  }
  coreMat.opacity = 0.55 + 0.45 * (1 - lift);
  bldBtn.textContent = liftTarget > 0.5 ? 'Gebäude zeigen' : 'Wohnung zeigen';
  if (sunRun) { sunHour += dt * 0.6; if (sunHour > SUNSET + 0.2 || sunHour < SUNRISE - 0.2) sunHour = SUNRISE - 0.2; sunInput.value = sunHour; applySun(); }
  if (walking) walkStep(dt); else controls.update();
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(frame);
}

camera.position.set(-40, 24, 58); controls.target.set(-4, 3, 9);
frame();
window.__app = { setWalk, stop, camera, controls, setUnit, setSun(h, m) { if (m !== undefined) { setMonth(m); monthSel.value = m; } sunHour = h; sunInput.value = h; applySun(); }, setLift(x) { liftTarget = x; } };
if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash === '#still') {
  liftTarget = 1; camera.position.set(...overView()); controls.target.set(...AC());
  setCaption(`Wohnung ${unit.name} im Erdgeschoss`, 'Tour mit dem Knopf starten');
  playBtn.textContent = 'Tour starten';
} else {
  tour();
}

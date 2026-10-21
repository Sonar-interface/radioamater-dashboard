import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/*
  Slike uz ispitna pitanja, 3D scene u Three.js: sjene, animacija, okretanje i zumiranje.
  Sve su rekonstrukcije; izvorne slike iz ispitnog materijala nisu bile dostupne.
  Dio koji otkriva odgovor crta se tek nakon odgovora (revealed), da slika ne oda rješenje.
  Animacija se isključuje ako korisnik ima uključeno smanjenje pokreta (prefers-reduced-motion).
*/

const INK = "#e6edf3";
const MUTED = "#8b98a5";
const AMBER = "#e3b341";
const BLUE = "#58a6ff";
const PURPLE = "#a371f7";
const GREEN = "#3fb950";
const RED = "#f78166";

type FlatKind = "otpornik" | "magnetno" | "sinus" | "ohm" | "serija" | "dijagram" | "jonosfera" | "ssb" | "polarizacija";
type Kind = "voltmetar" | FlatKind;
type Animator = (t: number) => void;
type Builder = (root: THREE.Group, revealed: boolean) => Animator | void;

function textSprite(text: string, color = INK, px = 64, scale = 0.5) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `600 ${px}px "JetBrains Mono", ui-monospace, monospace`;
  const w = Math.ceil(ctx.measureText(text).width) + 16;
  c.width = w;
  c.height = px + 16;
  ctx.font = `600 ${px}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 8, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set((w / c.height) * scale, scale, 1);
  s.renderOrder = 10;
  return s;
}

const mat = (color: string, roughness = 0.55, metalness = 0.1) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** Materijal koji svijetli (grijanje, naboji, istaknuti dijelovi). */
const glow = (color: string, emissive: string, k: number) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: k, roughness: 0.35, metalness: 0.1 });

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

function wire(points: THREE.Vector3[], color: string, r = 0.055, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const segs = Math.min(4000, Math.max(40, points.length * 12));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 12, closed), mat(color, 0.6, 0));
}

/** Strelica na točki `at` u smjeru `dir`. */
function arrow(at: THREE.Vector3, dir: THREE.Vector3, color: string, size = 0.2) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size, 14), mat(color, 0.5, 0));
  m.position.copy(at);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return m;
}

function circlePts(cx: number, cy: number, r: number, n = 64) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return V(cx + r * Math.cos(a), cy + r * Math.sin(a));
  });
}

/** Kružnica u horizontalnoj ravnini (XZ), oko okomite osi Y. */
const ringXZ = (R: number, n = 72) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return V(R * Math.cos(a), 0, R * Math.sin(a));
  });

/** Naboji koji putuju duž putanje; vraća animator. */
function electrons(root: THREE.Object3D, path: THREE.Curve<THREE.Vector3>, n: number, color: string, speed: number): Animator {
  const geo = new THREE.SphereGeometry(0.07, 16, 12);
  const m = glow(color, color, 1.4);
  const items: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(geo, m);
    root.add(s);
    items.push(s);
  }
  return (t) =>
    items.forEach((s, i) => {
      const u = (((t * speed + i / n) % 1) + 1) % 1;
      s.position.copy(path.getPointAt(u));
    });
}

/** Čestice koje kruže po kružnici radijusa R u ravnini y (smjer kao magnetno polje). */
function orbiters(root: THREE.Object3D, R: number, y: number, n: number, color: string, speed: number): Animator {
  const geo = new THREE.SphereGeometry(0.075, 14, 10);
  const m = glow(color, color, 1.2);
  const items: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(geo, m);
    root.add(s);
    items.push(s);
  }
  return (t) =>
    items.forEach((s, i) => {
      const a = -(t * speed) + (i / n) * Math.PI * 2; // smjer suprotan kazaljci gledano odozgo
      s.position.set(R * Math.cos(a), y, R * Math.sin(a));
    });
}

function combine(...fs: (Animator | void)[]): Animator | void {
  const list = fs.filter((f): f is Animator => typeof f === "function");
  return list.length ? (t: number) => list.forEach((f) => f(t)) : undefined;
}

/** Ravna podloga koja prima sjene (ShadowMaterial je providan tamo gdje nema sjene). */
function floorAt(y: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  m.userData['floor'] = true;
  return m;
}

/* ---------- Voltmetar ---------- */

/** AA ćelija položena vodoravno; plus pol okrenut prema +x ako je dir = 1, prema −x ako je dir = −1. */
function cell(dir: 1 | -1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 48), mat("#1d2733", 0.45, 0.3));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.7, 48), mat(AMBER, 0.5, 0.2));
  band.rotation.z = Math.PI / 2;
  band.position.x = dir * 0.75;
  g.add(band);
  const metal = mat("#c9d1d9", 0.25, 0.9);
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 32), metal);
  nub.rotation.z = Math.PI / 2;
  nub.position.x = dir * 1.18;
  g.add(nub);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 32), metal);
  plate.rotation.z = Math.PI / 2;
  plate.position.x = -dir * 1.12;
  g.add(plate);

  const plus = textSprite("+", AMBER, 80, 0.55);
  plus.position.set(dir * 0.8, 0.78, 0);
  const minus = textSprite("−", INK, 80, 0.55);
  minus.position.set(-dir * 1.05, 0.78, 0);
  const v = textSprite("1,5 V", INK, 56, 0.36);
  v.position.set(-dir * 0.15, 0, 0.5);
  g.add(plus, minus, v);
  return g;
}

function dialTexture(showNeedle: boolean) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(0, 0, S, S);
  const cx = S / 2, cy = S * 0.78, R = S * 0.6;
  const a0 = Math.PI * 1.17, a1 = Math.PI * 1.83;
  ctx.strokeStyle = "#1d2733";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a1);
  ctx.stroke();
  ctx.font = '600 34px "JetBrains Mono", monospace';
  ctx.fillStyle = "#1d2733";
  ctx.textAlign = "center";
  for (let i = 0; i <= 5; i++) {
    const a = a0 + ((a1 - a0) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * (R - 34), cy + Math.sin(a) * (R - 34));
    ctx.stroke();
    ctx.fillText(String(i), cx + Math.cos(a) * (R - 64), cy + Math.sin(a) * (R - 64) + 12);
  }
  ctx.font = '700 88px "JetBrains Mono", monospace';
  ctx.fillText("V", cx, cy - 40);
  if (showNeedle) {
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * (R - 10), cy + Math.sin(a0) * (R - 10));
    ctx.stroke();
  }
  ctx.fillStyle = "#1d2733";
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildVoltmetar(scene: THREE.Scene, revealed: boolean) {
  const left = cell(1);
  left.position.set(-1.25, -1.2, 0);
  const right = cell(-1);
  right.position.set(1.25, -1.2, 0);
  scene.add(left, right);

  const meter = new THREE.Group();
  meter.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 0.5), mat("#2b3540", 0.55, 0.2)));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: dialTexture(revealed) }));
  face.position.z = 0.26;
  meter.add(face);
  const j1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 24), mat("#c0392b", 0.4, 0));
  j1.position.set(0.7, -0.95, 0.1);
  const j2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 24), mat("#111", 0.4, 0));
  j2.position.set(-0.7, -0.95, 0.1);
  meter.add(j1, j2);
  meter.position.set(0, 1.35, 0);
  scene.add(meter);

  scene.add(
    wire([V(-2.43, -1.2), V(-3.0, -1.0), V(-2.2, 0.2, 0.1), V(-0.7, 0.3, 0.1)], "#151515"),
    wire([V(2.43, -1.2), V(3.0, -1.0), V(2.2, 0.2, 0.1), V(0.7, 0.3, 0.1)], "#c0392b"),
  );
  const cap = textSprite("Koliko pokazuje voltmetar?", MUTED, 48, 0.32);
  cap.position.set(0, -2.35, 0);
  scene.add(cap);
}

/* ---------- Scene (ravne sheme u 3D) ---------- */

function buildOtpornik(root: THREE.Group) {
  const mt = mat(INK, 0.5, 0.1);
  const t = 0.09, d = 0.12;
  const bar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt);
    m.position.set(x, y, 0);
    root.add(m);
  };
  const W = 2.4, H = 0.9;
  bar(W + t, t, 0, H / 2);
  bar(W + t, t, 0, -H / 2);
  bar(t, H + t, -W / 2, 0);
  bar(t, H + t, W / 2, 0);
  bar(1.3, t, -W / 2 - 0.65, 0);
  bar(1.3, t, W / 2 + 0.65, 0);
  for (const x of [-W / 2 - 1.3, W / 2 + 1.3]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), mt);
    dot.position.set(x, 0, 0);
    root.add(dot);
  }
}

function buildMagnetno(root: THREE.Group, revealed: boolean): Animator | void {
  // Vodič vertikalno; struja teče prema gore (naboji se kreću gore duž vodiča).
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.2, 48), glow("#c9a227", "#4a3a08", 0.2)));
  root.add(textSprite("struja I", AMBER, 44, 0.3).translateX(1.0).translateY(2.9));
  const parts: (Animator | void)[] = [electrons(root, new THREE.LineCurve3(V(0, -2.6), V(0, 2.6)), 6, "#fff1b8", 0.22)];
  if (revealed) {
    for (const R of [0.9, 1.5, 2.1]) {
      root.add(wire(ringXZ(R), BLUE, 0.03, true));
      parts.push(orbiters(root, R, 0, 5, BLUE, 0.5));
    }
    root.add(textSprite("B: magnetno polje (pravilo desne ruke)", BLUE, 40, 0.28).translateY(-3.3));
  }
  return combine(...parts);
}

function buildSinus(root: THREE.Group, revealed: boolean): Animator | void {
  const N = 250, SEG = 14; // 50 Hz × 5 s = 250 titraja
  const wave = (u: number) => 0.9 * Math.sin(2 * Math.PI * N * u);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= N * SEG; i++) {
    const u = i / (N * SEG);
    pts.push(V(-5 + 10 * u, wave(u)));
  }
  root.add(wire(pts, AMBER, 0.012));
  root.add(wire([V(-5, -1.6), V(5, -1.6)], MUTED, 0.02));
  for (let k = 0; k <= 5; k++) {
    root.add(textSprite(`${k} s`, MUTED, 40, 0.28).translateX(-5 + 2 * k).translateY(-2.0));
  }
  root.add(
    revealed
      ? textSprite("5 s × 50 Hz = 250 titraja", AMBER, 48, 0.36).translateY(2.0)
      : textSprite("Oscilacija 50 Hz, promatrano 5 s", MUTED, 44, 0.3).translateY(2.0),
  );
  // Pokazivač vremena prolazi kroz signal (cijeli prikaz 8 s).
  const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), glow(INK, INK, 1));
  root.add(cursor);
  return (t) => {
    const u = (t / 8) % 1;
    cursor.position.set(-5 + 10 * u, wave(u), 0.05);
  };
}

function buildOhm(root: THREE.Group, revealed: boolean): Animator | void {
  const L = 3, T = 1.6;
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => root.add(wire([a, b], INK, 0.05));
  seg(V(-L, T), V(-0.45, T));
  seg(V(0.45, T), V(L, T));
  seg(V(L, T), V(L, 0.6));
  seg(V(L, -0.6), V(L, -T));
  seg(V(L, -T), V(-L, -T));
  seg(V(-L, -T), V(-L, 0.0));
  seg(V(-L, 0.3), V(-L, T));
  const plateLong = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.1), mat(INK, 0.4, 0.2));
  plateLong.position.set(-L, 0.3, 0);
  const plateShort = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.1), mat(INK, 0.4, 0.2));
  plateShort.position.set(-L, 0.0, 0);
  const resMat = glow("#2b3540", "#ff6a3d", 0);
  const res = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.14), resMat);
  res.position.set(L, 0, 0);
  root.add(plateLong, plateShort, res);
  root.add(wire(circlePts(0, T, 0.45, 40), INK, 0.04, true));
  root.add(textSprite("A", INK, 56, 0.4).translateY(T));
  root.add(textSprite("+", AMBER, 60, 0.36).translateX(-L - 0.45).translateY(0.85));
  root.add(textSprite("10 V", INK, 44, 0.3).translateX(-L - 0.9));
  root.add(textSprite("100 Ω", INK, 44, 0.3).translateX(L + 0.9));
  root.add(
    revealed
      ? textSprite("I = 0,1 A", AMBER, 48, 0.36).translateY(T + 0.9)
      : textSprite("I = ?", MUTED, 48, 0.36).translateY(T + 0.9),
  );

  // Naboji kruže petljom; otpornik se grije nakon odgovora.
  const path = new THREE.CurvePath<THREE.Vector3>();
  const corners = [V(-L, T), V(L, T), V(L, -T), V(-L, -T), V(-L, T)];
  for (let i = 0; i < 4; i++) path.add(new THREE.LineCurve3(corners[i], corners[i + 1]));
  const flow = electrons(root, path, 12, "#ffd98a", 0.07);
  return (t) => {
    flow(t);
    resMat.emissiveIntensity = revealed ? 0.25 + 0.25 * Math.sin(t * 5) : 0;
  };
}

function buildSerija(root: THREE.Group, revealed: boolean): Animator | void {
  const seg = (a: number, b: number) => root.add(wire([V(a, 0), V(b, 0)], INK, 0.05));
  seg(-4.6, -3.2);
  seg(-1.8, -0.7);
  seg(0.7, 1.8);
  seg(3.2, 4.6);
  for (const x of [-4.6, 4.6]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), mat(INK, 0.4, 0.2));
    dot.position.set(x, 0, 0);
    root.add(dot);
  }
  const parts = [
    { x: -2.5, label: "5 Ω", band: AMBER },
    { x: 0, label: "10 Ω", band: RED },
    { x: 2.5, label: "20 Ω", band: BLUE },
  ];
  for (const p of parts) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 40), mat("#e3d3ac", 0.6, 0));
    body.rotation.z = Math.PI / 2;
    body.position.set(p.x, 0, 0);
    root.add(body);
    for (const dx of [-0.5, -0.3]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 32), mat(p.band, 0.5, 0));
      b.rotation.z = Math.PI / 2;
      b.position.set(p.x + dx, 0, 0);
      root.add(b);
    }
    root.add(textSprite(p.label, INK, 44, 0.3).translateX(p.x).translateY(0.9));
  }
  root.add(
    revealed
      ? textSprite("R = 5 + 10 + 20 = 35 Ω", AMBER, 44, 0.34).translateY(-1.2)
      : textSprite("R = ?", MUTED, 44, 0.34).translateY(-1.2),
  );
  return electrons(root, new THREE.LineCurve3(V(-4.6, 0), V(4.6, 0)), 8, "#9fd3ff", 0.1);
}

function buildDijagram(root: THREE.Group, revealed: boolean): Animator | void {
  // Izotropna antena: sfera (jednako zračenje u svim smjerovima), žičani prikaz.
  const omni = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 24, 16)),
    new THREE.LineBasicMaterial({ color: MUTED, transparent: true, opacity: 0.45 }),
  );
  omni.position.set(-1.8, 0, 0);
  root.add(omni);
  root.add(textSprite("izotropna", MUTED, 40, 0.28).translateX(-1.8).translateY(-1.7));
  root.add(textSprite("usmjerena", MUTED, 40, 0.28).translateX(1.8).translateY(-1.7));
  root.add(
    revealed
      ? textSprite("Usmjerena: veće pojačanje u smjeru maksimuma", AMBER, 36, 0.26).translateY(1.9)
      : textSprite("Zračenje antene: sfera = jednako u svim smjerovima", MUTED, 36, 0.26).translateY(1.9),
  );
  if (!revealed) return;
  // Usmjereni dijagram: rotacijska ploha (lobe) oko osi, zračenje sabijeno prema gore.
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 60; i++) {
    const th = (i / 60) * Math.PI;
    const r = 0.25 + 1.2 * Math.exp(-(th * th) / (2 * 0.35 * 0.35));
    prof.push(new THREE.Vector2(r * Math.sin(th), r * Math.cos(th)));
  }
  const lobe = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 72),
    new THREE.MeshStandardMaterial({ color: AMBER, emissive: "#5a4208", emissiveIntensity: 0.4, roughness: 0.35, side: THREE.DoubleSide }),
  );
  lobe.position.set(1.8, 0, 0);
  root.add(lobe);
  return (t) => {
    const s = 1 + 0.03 * Math.sin(t * 2);
    lobe.scale.set(s, s, s);
  };
}

function buildJonosfera(root: THREE.Group, revealed: boolean): Animator | void {
  // Zemlja je sfera; slojevi su koncentrične kalote iznad nje (shema, nije u mjerilu).
  const CY = -4.2;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(4.2, 96, 64), mat("#16381f", 0.95, 0));
  earth.position.set(0, CY, 0);
  root.add(earth);
  root.add(textSprite("Zemlja", GREEN, 40, 0.28).translateX(2.8).translateY(0.35));
  if (!revealed) {
    root.add(textSprite("Visina (shema, nije u mjerilu)", MUTED, 40, 0.28).translateY(2.2));
    return;
  }
  const layers: [string, number, string][] = [
    ["D", 4.5, AMBER],
    ["E", 4.9, BLUE],
    ["F1", 5.4, PURPLE],
    ["F2", 6.0, RED],
  ];
  const caps: THREE.MeshStandardMaterial[] = [];
  for (const [name, r, color] of layers) {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    caps.push(m);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 36, 0, Math.PI * 2, 0, 0.55), m);
    cap.position.set(0, CY, 0);
    root.add(cap);
    const th = 0.5;
    root.add(textSprite(`${name} sloj`, color, 40, 0.3).translateX(r * Math.sin(th) + 0.3).translateY(r * Math.cos(th) + CY));
  }
  root.add(textSprite("Danju: D, E, F1 i F2 (noću ostaje F2)", INK, 36, 0.26).translateY(2.2));
  // Radio-val se odbija od sloja F2 i vraća na Zemlju.
  const curve = new THREE.QuadraticBezierCurve3(V(-2.2, -0.62), V(0, 4.6), V(2.2, -0.62));
  root.add(wire(curve.getPoints(80), INK, 0.03));
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), glow(INK, INK, 1.2));
  root.add(bead);
  return (t) => {
    bead.position.copy(curve.getPointAt((t * 0.28) % 1));
    caps.forEach((m, i) => (m.opacity = 0.3 + 0.08 * Math.sin(t * 1.5 + i)));
  };
}

function buildSsb(root: THREE.Group, revealed: boolean): Animator | void {
  root.add(wire([V(-3.2, -0.8), V(3.2, -0.8)], MUTED, 0.02));
  root.add(textSprite("f nosioca (potisnut)", MUTED, 40, 0.28).translateY(-1.25));
  if (!revealed) return;
  // Bočni pojasevi kao tri paralelne vrpce u dubini (3D efekt), koje lagano titraju.
  const g = new THREE.Group();
  root.add(g);
  const band = (c: number, z: number) => [
    V(c - 1.0, -0.8, z), V(c - 0.5, 0.3, z), V(c, 0.5, z), V(c + 0.5, 0.3, z), V(c + 1.0, -0.8, z),
  ];
  for (const z of [-0.35, 0, 0.35]) {
    g.add(wire(band(-1.2, z), BLUE, 0.035));
    g.add(wire(band(1.2, z), AMBER, 0.035));
  }
  root.add(textSprite("LSB", BLUE, 44, 0.3).translateX(-1.2).translateY(0.95));
  root.add(textSprite("USB", AMBER, 44, 0.3).translateX(1.2).translateY(0.95));
  root.add(textSprite("LSB ispod nosioca · USB iznad nosioca", INK, 36, 0.26).translateY(-1.7));
  return (t) => {
    g.scale.y = 1 + 0.05 * Math.sin(t * 2.4);
  };
}

function buildPolarizacija(root: THREE.Group, revealed: boolean): Animator | void {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 16), mat(INK, 0.3, 0.8));
  rod.position.set(-2.6, 0.15, 0);
  root.add(rod);
  root.add(textSprite("antena", MUTED, 36, 0.26).translateX(-2.6).translateY(-1.6));
  root.add(wire([V(-2.0, 0), V(3.0, 0)], MUTED, 0.02));
  root.add(arrow(V(3.1, 0), V(1, 0), MUTED, 0.25));
  root.add(textSprite("smjer širenja", MUTED, 36, 0.26).translateX(0.6).translateY(-1.45));
  if (!revealed) {
    root.add(textSprite("Kako je orijentirano E polje?", MUTED, 36, 0.26).translateX(0.6).translateY(1.5));
    return;
  }
  const k = (x: number) => (2 * Math.PI * (x + 2)) / 2.4;
  const ePts: THREE.Vector3[] = [], bPts: THREE.Vector3[] = [];
  for (let x = -2.0; x <= 3.2; x += 0.05) {
    ePts.push(V(x, 0.9 * Math.sin(k(x))));
    bPts.push(V(x, 0, 0.9 * Math.sin(k(x))));
  }
  root.add(wire(ePts, AMBER, 0.04));
  root.add(wire(bPts, BLUE, 0.035));
  root.add(textSprite("E: vertikalno (vertikalna polarizacija)", AMBER, 34, 0.26).translateX(0.6).translateY(1.5));
  root.add(textSprite("B: okomito na E", BLUE, 34, 0.26).translateX(0.6).translateY(-1.85));
  const eBead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glow(AMBER, AMBER, 1.2));
  const bBead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glow(BLUE, BLUE, 1.2));
  root.add(eBead, bBead);
  return (t) => {
    const x = -2 + ((t * 0.9) % 5.2);
    eBead.position.set(x, 0.9 * Math.sin(k(x)), 0);
    bBead.position.set(x, 0, 0.9 * Math.sin(k(x)));
  };
}

/** Dimenzije sadržaja (polovina širine hw, polovina visine hh), položaj podloge i gradnja scene. */
const FLAT: Record<FlatKind, { hw: number; hh: number; floor?: number; build: Builder }> = {
  otpornik: { hw: 3.6, hh: 1.6, build: (r) => buildOtpornik(r) },
  magnetno: { hw: 3.2, hh: 3.6, floor: -2.8, build: buildMagnetno },
  sinus: { hw: 5.4, hh: 2.4, floor: -2.2, build: buildSinus },
  ohm: { hw: 4.6, hh: 2.8, floor: -2.4, build: buildOhm },
  serija: { hw: 5.2, hh: 1.8, floor: -1.0, build: buildSerija },
  dijagram: { hw: 4.0, hh: 2.2, floor: -1.4, build: buildDijagram },
  jonosfera: { hw: 4.2, hh: 2.6, build: buildJonosfera },
  ssb: { hw: 3.6, hh: 1.8, floor: -1.0, build: buildSsb },
  polarizacija: { hw: 3.8, hh: 2.0, build: buildPolarizacija },
};

const LABEL: Record<Kind, string> = {
  voltmetar: "Dvije ćelije od 1,5 V spojene plus na plus; voltmetar je spojen na njihove krajnje minus polove.",
  otpornik: "Simbol: pravokutnik s dva izvoda.",
  magnetno: "Vertikalni vodič sa strujom; kružnice predstavljaju magnetsko polje.",
  sinus: "Sinusni signal 50 Hz promatran kroz 5 sekundi.",
  ohm: "Strujni krug: baterija 10 V, otpornik 100 Ω i ampermetar.",
  serija: "Tri otpornika od 5, 10 i 20 Ω spojena u seriju.",
  dijagram: "Polarni dijagram izotropne i usmjerene antene.",
  jonosfera: "Shema ionosferskih slojeva D, E, F1 i F2 iznad Zemlje.",
  ssb: "Spektar SSB signala: donja i gornja bočna, bez nosioca.",
  polarizacija: "Vertikalna antena i smjer električnog (E) i magnetskog (B) polja.",
};

/** Perspektivna kamera koja uklapa sadržaj (hw × hh) u karticu; vraća udaljenost. */
function fitPersp(cam: THREE.PerspectiveCamera, aspect: number, hw: number, hh: number) {
  cam.aspect = aspect;
  const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const dist = Math.max(hh / tan, hw / (tan * aspect)) * 1.08 + 1.5;
  cam.position.set(0, hh * 0.45, dist);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return dist;
}

export default function ExamFigure({ kind, revealed = false }: { kind: Kind; revealed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const flat = kind === "voltmetar" ? null : FLAT[kind];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x0d1117, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x58a6ff, 0.6);
    rim.position.set(-6, 3, -4);
    scene.add(rim);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const root = new THREE.Group();
    scene.add(root);

    let camera: THREE.PerspectiveCamera;
    let controls: OrbitControls;
    let anim: Animator | void;
    if (!flat) {
      camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0.8, 0.9, 9.2);
      buildVoltmetar(scene, revealed);
      scene.add(floorAt(-1.7));
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 6;
      controls.maxDistance = 14;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.65;
      controls.minAzimuthAngle = -Math.PI / 3;
      controls.maxAzimuthAngle = Math.PI / 3;
      controls.target.set(0, 0, 0);
    } else {
      camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 200);
      const dist = fitPersp(camera, w / h, flat.hw, flat.hh);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = dist * 0.55;
      controls.maxDistance = dist * 1.6;
      controls.minPolarAngle = Math.PI * 0.2;
      controls.maxPolarAngle = Math.PI * 0.55;
      controls.minAzimuthAngle = -0.9;
      controls.maxAzimuthAngle = 0.9;
      controls.target.set(0, 0, 0);
      anim = flat.build(root, revealed);
      if (flat.floor !== undefined) scene.add(floorAt(flat.floor));
    }

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.receiveShadow = true;
        m.castShadow = !m.userData['floor'];
      }
    });

    const t0 = performance.now();
    let raf = 0;
    const frame = () => {
      const t = reduce ? 0 : (performance.now() - t0) / 1000;
      anim?.(t);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight;
      renderer.setSize(nw, nh);
      if (flat) {
        const d = fitPersp(camera, nw / nh, flat.hw, flat.hh);
        controls.minDistance = d * 0.55;
        controls.maxDistance = d * 1.6;
      } else {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mt of mats) {
          (mt as THREE.MeshBasicMaterial).map?.dispose();
          mt.dispose();
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [kind, revealed, flat]);

  return (
    <figure className="mt-3">
      <div
        ref={ref}
        role="img"
        aria-label={LABEL[kind]}
        className={`w-full cursor-grab overflow-hidden rounded-lg border border-border bg-panel ${flat ? "h-60 md:h-72" : "h-64 md:h-80"}`}
      />
      <figcaption className="mt-1 text-xs text-muted-foreground">
        Povucite za okretanje i zumiranje. Slika je rekonstrukcija; izvorna slika iz ispitnog materijala nije bila dostupna.
      </figcaption>
    </figure>
  );
}

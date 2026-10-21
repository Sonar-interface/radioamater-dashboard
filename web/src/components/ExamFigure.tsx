import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/*
  Slike uz ispitna pitanja, iscrtane u Three.js. Sve su rekonstrukcije; izvorne slike iz ispitnog materijala nisu bile dostupne.
  Dio koji otkriva odgovor crta se tek nakon odgovora (revealed), da slika ne oda rješenje.
  - voltmetar: dvije ćelije od 1,5 V spojene plus na plus, voltmetar na minus polovima (3D, moguće okretanje).
  - otpornik: simbol stalnog otpornika prema IEC.
  - magnetno: presjek vodiča sa strujom prema promatraču; kružnice polja nakon odgovora.
  - sinus: 50 Hz kroz 5 s, 250 titraja; broj nakon odgovora.
  - ohm: krug s baterijom 10 V, otpornikom 100 Ω i ampermetrom; struja nakon odgovora.
  - serija: otpornici 5, 10 i 20 Ω u nizu; zbroj nakon odgovora.
  - dijagram: polarni dijagram izotropne i usmjerene antene (shema, nije u mjerilu).
  - jonosfera: slojevi D, E, F1, F2 (shema, nije u mjerilu) nakon odgovora.
  - ssb: spektar LSB i USB bez nosioca; bočne pojaseve nakon odgovora.
  - polarizacija: vertikalna antena; smjer E polja nakon odgovora.
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

function wire(points: THREE.Vector3[], color: string, r = 0.055, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const segs = Math.min(4000, Math.max(40, points.length * 12));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 12, closed), mat(color, 0.6, 0));
}

/** Strelica na točki `at` u smjeru `dir`. */
function arrow(at: THREE.Vector3, dir: THREE.Vector3, color: string, size = 0.2) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size, 14), mat(color, 0.5, 0));
  m.position.copy(at);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

function circlePts(cx: number, cy: number, r: number, n = 64) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0);
  });
}

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

/* ---------- Voltmetar (3D) ---------- */

/** AA ćelija položena vodoravno; plus pol okrenut prema +x ako je dir = 1, prema −x ako je dir = −1. */
function cell(dir: 1 | -1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 48), mat("#1d2733", 0.45, 0.3));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  // obojeni plašt na strani plusa
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.7, 48), mat(AMBER, 0.5, 0.2));
  band.rotation.z = Math.PI / 2;
  band.position.x = dir * 0.75;
  g.add(band);
  const metal = mat("#c9d1d9", 0.25, 0.9);
  // plus pol: izbočina
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 32), metal);
  nub.rotation.z = Math.PI / 2;
  nub.position.x = dir * 1.18;
  g.add(nub);
  // minus pol: ravna ploča
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
  // Ćelije: lijeva plus desno, desna plus lijevo → plus na plus u sredini
  const left = cell(1);
  left.position.set(-1.25, -1.2, 0);
  const right = cell(-1);
  right.position.set(1.25, -1.2, 0);
  scene.add(left, right);

  // Voltmetar
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

  // Žice od krajnjih (minus) polova do voltmetra
  scene.add(
    wire([V(-2.43, -1.2), V(-3.0, -1.0), V(-2.2, 0.2, 0.1), V(-0.7, 0.3, 0.1)], "#151515"),
    wire([V(2.43, -1.2), V(3.0, -1.0), V(2.2, 0.2, 0.1), V(0.7, 0.3, 0.1)], "#c0392b"),
  );
  const cap = textSprite("Koliko pokazuje voltmetar?", MUTED, 48, 0.32);
  cap.position.set(0, -2.35, 0);
  scene.add(cap);
}

/* ---------- Ravne sheme (ortografska kamera) ---------- */

function buildOtpornik(root: THREE.Group) {
  const mt = mat(INK, 0.5, 0.1);
  const t = 0.09, d = 0.12;
  const bar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt);
    m.position.set(x, y, 0);
    root.add(m);
  };
  const W = 2.4, H = 0.9;
  bar(W + t, t, 0, H / 2); // gornji rub
  bar(W + t, t, 0, -H / 2); // donji rub
  bar(t, H + t, -W / 2, 0); // lijevi rub
  bar(t, H + t, W / 2, 0); // desni rub
  bar(1.3, t, -W / 2 - 0.65, 0); // izvod lijevo
  bar(1.3, t, W / 2 + 0.65, 0); // izvod desno
  for (const x of [-W / 2 - 1.3, W / 2 + 1.3]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), mt);
    dot.position.set(x, 0, 0);
    root.add(dot);
  }
}

function buildMagnetno(root: THREE.Group, revealed: boolean) {
  // Vodič gledan s kraja: struja teče prema promatraču.
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 40), mat(AMBER, 0.4, 0.5));
  cable.rotation.x = Math.PI / 2;
  root.add(cable);
  root.add(textSprite("Presjek vodiča: struja I teče prema vama (⊙)", MUTED, 40, 0.28).translateY(-2.6));
  if (revealed) {
    for (const R of [1.0, 1.7, 2.4]) {
      root.add(wire(circlePts(0, 0, R, 72), BLUE, 0.035, true));
      // desnovojno pravilo: struja prema vama → polje u smjeru suprotnom od kazaljke na satu
      root.add(arrow(V(0, R), V(-1, 0), BLUE, 0.25));
    }
    root.add(textSprite("B: koncentrične kružnice oko vodiča", BLUE, 40, 0.28).translateY(2.6));
  }
}

function buildSinus(root: THREE.Group, revealed: boolean) {
  const N = 250, SEG = 14; // 50 Hz × 5 s = 250 titraja
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= N * SEG; i++) {
    const t = i / (N * SEG);
    pts.push(V(-5 + 10 * t, 0.9 * Math.sin(2 * Math.PI * N * t)));
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
}

function buildOhm(root: THREE.Group, revealed: boolean) {
  const L = 3, T = 1.6;
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => root.add(wire([a, b], INK, 0.05));
  // gornja grana s ampermetrom u sredini
  seg(V(-L, T), V(-0.45, T));
  seg(V(0.45, T), V(L, T));
  // desna strana s otpornikom
  seg(V(L, T), V(L, 0.6));
  seg(V(L, -0.6), V(L, -T));
  seg(V(L, -T), V(-L, -T));
  // lijeva strana s baterijom (dugačka linija = +, kratka = −)
  seg(V(-L, -T), V(-L, 0.0));
  seg(V(-L, 0.3), V(-L, T));
  const plateLong = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.1), mat(INK, 0.4, 0.2));
  plateLong.position.set(-L, 0.3, 0);
  const plateShort = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.1), mat(INK, 0.4, 0.2));
  plateShort.position.set(-L, 0.0, 0);
  const res = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.14), mat("#2b3540", 0.5, 0.2));
  res.position.set(L, 0, 0);
  root.add(plateLong, plateShort, res);
  // ampermetar
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
}

function buildSerija(root: THREE.Group, revealed: boolean) {
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
  const res = [
    { x: -2.5, label: "5 Ω" },
    { x: 0, label: "10 Ω" },
    { x: 2.5, label: "20 Ω" },
  ];
  for (const r of res) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.12), mat("#2b3540", 0.5, 0.2));
    box.position.set(r.x, 0, 0);
    root.add(box);
    root.add(textSprite(r.label, INK, 44, 0.3).translateX(r.x).translateY(0.8));
  }
  root.add(
    revealed
      ? textSprite("R = 5 + 10 + 20 = 35 Ω", AMBER, 44, 0.34).translateY(-1.2)
      : textSprite("R = ?", MUTED, 44, 0.34).translateY(-1.2),
  );
}

function buildDijagram(root: THREE.Group, revealed: boolean) {
  // Izotropna antena: krug (isto zračenje u svim smjerovima), referentna kružnica za usporedbu.
  root.add(wire(circlePts(-1.8, 0, 1.0, 72), MUTED, 0.03, true));
  root.add(wire(circlePts(1.8, 0, 1.0, 72), MUTED, 0.02, true));
  // Usmjerena antena: zračenje sabijeno u jedan smjer (shema).
  if (revealed) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 120; i++) {
      const th = -Math.PI + (i / 120) * Math.PI * 2;
      const r = 0.25 + 1.2 * Math.exp(-(th * th) / (2 * 0.35 * 0.35));
      pts.push(V(1.8 + r * Math.cos(th), r * Math.sin(th)));
    }
    root.add(wire(pts, AMBER, 0.045, true));
  }
  root.add(textSprite("izotropna", MUTED, 40, 0.28).translateX(-1.8).translateY(-1.5));
  root.add(textSprite("usmjerena", MUTED, 40, 0.28).translateX(1.8).translateY(-1.5));
  root.add(
    revealed
      ? textSprite("Usmjerena: veće pojačanje u smjeru maksimuma", AMBER, 36, 0.26).translateY(1.8)
      : textSprite("Zračenje antene: krug = jednako u svim smjerovima", MUTED, 36, 0.26).translateY(1.8),
  );
}

function buildJonosfera(root: THREE.Group, revealed: boolean) {
  root.add(wire([V(-3.6, -2.0), V(3.6, -2.0)], GREEN, 0.05));
  root.add(textSprite("Zemlja", GREEN, 40, 0.28).translateX(-2.6).translateY(-2.25));
  if (!revealed) {
    root.add(textSprite("Visina (shema, nije u mjerilu)", MUTED, 40, 0.28).translateY(2.1));
    return;
  }
  const layers: [string, number, string][] = [
    ["D", -1.2, AMBER],
    ["E", -0.3, BLUE],
    ["F1", 0.6, PURPLE],
    ["F2", 1.5, RED],
  ];
  for (const [name, y, color] of layers) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 0.16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    plane.position.set(0, y, 0);
    root.add(plane);
    root.add(textSprite(`${name} sloj`, color, 40, 0.3).translateX(3.3).translateY(y));
  }
  root.add(textSprite("Danju: D, E, F1 i F2 (noću ostaje F2)", INK, 36, 0.26).translateY(2.1));
}

function buildSsb(root: THREE.Group, revealed: boolean) {
  root.add(wire([V(-3.2, -0.8), V(3.2, -0.8)], MUTED, 0.02));
  root.add(textSprite("f nosioca (potisnut)", MUTED, 40, 0.28).translateY(-1.25));
  if (!revealed) return;
  // donja bočna (LSB) lijevo od nosioca, gornja bočna (USB) desno
  const band = (c: number, color: string) =>
    root.add(
      wire(
        [V(c - 1.0, -0.8), V(c - 0.5, 0.3), V(c, 0.5), V(c + 0.5, 0.3), V(c + 1.0, -0.8)],
        color,
        0.04,
      ),
    );
  band(-1.2, BLUE);
  band(1.2, AMBER);
  root.add(textSprite("LSB", BLUE, 44, 0.3).translateX(-1.2).translateY(0.95));
  root.add(textSprite("USB", AMBER, 44, 0.3).translateX(1.2).translateY(0.95));
  root.add(textSprite("LSB ispod nosioca · USB iznad nosioca", INK, 36, 0.26).translateY(-1.7));
}

function buildPolarizacija(root: THREE.Group, revealed: boolean) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 12), mat(INK, 0.3, 0.8));
  rod.position.set(-2.6, 0.15, 0);
  root.add(rod);
  root.add(textSprite("antena", MUTED, 36, 0.26).translateX(-2.6).translateY(-1.6));
  root.add(wire([V(-2.0, 0), V(3.0, 0)], MUTED, 0.02));
  root.add(arrow(V(3.1, 0), V(1, 0), MUTED, 0.25));
  root.add(textSprite("smjer širenja", MUTED, 36, 0.26).translateX(0.6).translateY(-1.45));
  if (revealed) {
    const pts: THREE.Vector3[] = [];
    for (let x = -2.0; x <= 3.2; x += 0.05) pts.push(V(x, 0.9 * Math.sin((2 * Math.PI * (x + 2)) / 2.4)));
    root.add(wire(pts, AMBER, 0.04));
    root.add(textSprite("E polje: vertikalno (vertikalna polarizacija)", AMBER, 36, 0.26).translateX(0.6).translateY(1.5));
  } else {
    root.add(textSprite("Kako je orijentirano E polje?", MUTED, 36, 0.26).translateX(0.6).translateY(1.5));
  }
}

/** Dimenzije ravnih slika: polovina širine i visine sadržaja te visina kartice. */
const FLAT: Record<FlatKind, { hw: number; hh: number; cls: string; build: (root: THREE.Group, revealed: boolean) => void }> = {
  otpornik: { hw: 3.6, hh: 1.6, cls: "h-40 md:h-48", build: (r) => buildOtpornik(r) },
  magnetno: { hw: 3.0, hh: 2.9, cls: "h-56 md:h-64", build: buildMagnetno },
  sinus: { hw: 5.4, hh: 2.4, cls: "h-40 md:h-48", build: buildSinus },
  ohm: { hw: 4.6, hh: 2.7, cls: "h-56 md:h-64", build: buildOhm },
  serija: { hw: 5.2, hh: 1.6, cls: "h-40 md:h-48", build: buildSerija },
  dijagram: { hw: 4.0, hh: 2.1, cls: "h-48 md:h-56", build: buildDijagram },
  jonosfera: { hw: 4.2, hh: 2.5, cls: "h-56 md:h-64", build: buildJonosfera },
  ssb: { hw: 3.6, hh: 1.8, cls: "h-40 md:h-48", build: buildSsb },
  polarizacija: { hw: 3.8, hh: 1.9, cls: "h-48 md:h-56", build: buildPolarizacija },
};

const LABEL: Record<Kind, string> = {
  voltmetar: "Dvije ćelije od 1,5 V spojene plus na plus; voltmetar je spojen na njihove krajnje minus polove.",
  otpornik: "Simbol: pravokutnik s dva izvoda.",
  magnetno: "Presjek vodiča sa strujom; kružnice predstavljaju magnetsko polje.",
  sinus: "Sinusni signal 50 Hz promatran kroz 5 sekundi.",
  ohm: "Strujni krug: baterija 10 V, otpornik 100 Ω i ampermetar.",
  serija: "Tri otpornika od 5, 10 i 20 Ω spojena u seriju.",
  dijagram: "Polarni dijagram izotropne i usmjerene antene.",
  jonosfera: "Shema ionosferskih slojeva D, E, F1 i F2.",
  ssb: "Spektar SSB signala: donja i gornja bočna, bez nosioca.",
  polarizacija: "Vertikalna antena i smjer električnog polja.",
};

/** Ortografska kamera koja uklapa sadržaj (hw × hh) u kartici bilo kojih proporcija. */
function fitOrtho(cam: THREE.OrthographicCamera, aspect: number, hw: number, hh: number) {
  const halfH = Math.max(hh, hw / aspect);
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.right = halfH * aspect;
  cam.left = -halfH * aspect;
  cam.updateProjectionMatrix();
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
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 6);
    scene.add(key);

    let camera: THREE.Camera;
    let controls: OrbitControls | null = null;
    if (!flat) {
      const cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      cam.position.set(0.8, 0.9, 9.2);
      camera = cam;
      buildVoltmetar(scene, revealed);
      controls = new OrbitControls(cam, renderer.domElement);
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
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
      cam.position.set(0, 0, 10);
      fitOrtho(cam, w / h, flat.hw, flat.hh);
      camera = cam;
      const root = new THREE.Group();
      scene.add(root);
      flat.build(root, revealed);
    }

    let raf = 0;
    const loop = () => {
      controls?.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight;
      renderer.setSize(nw, nh);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera && flat) {
        fitOrtho(camera, nw / nh, flat.hw, flat.hh);
      }
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls?.dispose();
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
        className={`w-full overflow-hidden rounded-lg border border-border bg-panel ${flat ? flat.cls : "h-64 cursor-grab md:h-80"}`}
      />
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {kind === "voltmetar" ? "Povucite za okretanje. " : ""}Slika je rekonstrukcija; izvorna slika iz ispitnog materijala nije bila dostupna.
      </figcaption>
    </figure>
  );
}

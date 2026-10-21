import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/*
  Slike uz ispitna pitanja, iscrtane u Three.js.
  - "voltmetar": dvije ćelije od 1,5 V spojene suprotno (plus na plus), voltmetar na krajnjim polovima.
    Kazaljka se pojavi tek nakon odgovora (revealed), da slika ne oda rješenje.
  - "otpornik": simbol stalnog otpornika prema IEC (pravokutnik s dva izvoda).
  Obje slike su rekonstrukcije; izvorne slike iz ispitnog materijala nisu bile dostupne.
*/

type Kind = "voltmetar" | "otpornik";

const INK = "#e6edf3";
const MUTED = "#8b98a5";
const AMBER = "#e3b341";

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

/** AA ćelija položena vodoravno; plus pol okrenut prema +x ako je dir = 1, prema −x ako je dir = −1. */
function cell(dir: 1 | -1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 2.2, 48),
    new THREE.MeshStandardMaterial({ color: "#1d2733", metalness: 0.3, roughness: 0.45 }),
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);
  // obojeni plašt na strani plusa
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.425, 0.425, 0.7, 48),
    new THREE.MeshStandardMaterial({ color: AMBER, metalness: 0.2, roughness: 0.5 }),
  );
  band.rotation.z = Math.PI / 2;
  band.position.x = dir * 0.75;
  g.add(band);
  const metal = new THREE.MeshStandardMaterial({ color: "#c9d1d9", metalness: 0.9, roughness: 0.25 });
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

function wire(points: THREE.Vector3[], color: string) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.055, 12, false),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
  );
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
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.9, 0.5),
    new THREE.MeshStandardMaterial({ color: "#2b3540", roughness: 0.55, metalness: 0.2 }),
  );
  meter.add(box);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: dialTexture(revealed) }));
  face.position.z = 0.26;
  meter.add(face);
  const jackMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
  const j1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 24), jackMat("#c0392b"));
  j1.position.set(0.7, -0.95, 0.1);
  const j2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 24), jackMat("#111"));
  j2.position.set(-0.7, -0.95, 0.1);
  meter.add(j1, j2);
  meter.position.set(0, 1.35, 0);
  scene.add(meter);

  // Žice od krajnjih (minus) polova do voltmetra
  scene.add(
    wire([new THREE.Vector3(-2.43, -1.2, 0), new THREE.Vector3(-3.0, -1.0, 0), new THREE.Vector3(-2.2, 0.2, 0.1), new THREE.Vector3(-0.7, 0.3, 0.1)], "#151515"),
    wire([new THREE.Vector3(2.43, -1.2, 0), new THREE.Vector3(3.0, -1.0, 0), new THREE.Vector3(2.2, 0.2, 0.1), new THREE.Vector3(0.7, 0.3, 0.1)], "#c0392b"),
  );
  const cap = textSprite("Koliko pokazuje voltmetar?", MUTED, 48, 0.32);
  cap.position.set(0, -2.35, 0);
  scene.add(cap);
}

function buildOtpornik(scene: THREE.Scene) {
  const mat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5, metalness: 0.1 });
  const t = 0.09, d = 0.12;
  const bar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, 0);
    scene.add(m);
  };
  const W = 2.4, H = 0.9;
  bar(W + t, t, 0, H / 2); // gornji rub
  bar(W + t, t, 0, -H / 2); // donji rub
  bar(t, H + t, -W / 2, 0); // lijevi rub
  bar(t, H + t, W / 2, 0); // desni rub
  bar(1.3, t, -W / 2 - 0.65, 0); // izvod lijevo
  bar(1.3, t, W / 2 + 0.65, 0); // izvod desno
  for (const x of [-W / 2 - 1.3, W / 2 + 1.3]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), mat);
    dot.position.set(x, 0, 0);
    scene.add(dot);
  }
}

export default function ExamFigure({ kind, revealed = false }: { kind: Kind; revealed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

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
    if (kind === "voltmetar") {
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
      const aspect = w / h, half = 2.6;
      const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 50);
      cam.position.set(0, 0, 10);
      camera = cam;
      buildOtpornik(scene);
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
      } else if (camera instanceof THREE.OrthographicCamera) {
        const half = 2.6, a = nw / nh;
        camera.left = -half * a;
        camera.right = half * a;
      }
      (camera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();
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
  }, [kind, revealed]);

  const label =
    kind === "voltmetar"
      ? "Dvije ćelije od 1,5 V spojene plus na plus; voltmetar je spojen na njihove krajnje minus polove."
      : "Simbol: pravokutnik s dva izvoda.";
  return (
    <figure className="mt-3">
      <div
        ref={ref}
        role="img"
        aria-label={label}
        className={`w-full overflow-hidden rounded-lg border border-border bg-panel ${kind === "voltmetar" ? "h-64 cursor-grab md:h-80" : "h-40 md:h-48"}`}
      />
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {kind === "voltmetar" ? "Povucite za okretanje. " : ""}Slika je rekonstrukcija; izvorna slika iz ispitnog materijala nije bila dostupna.
      </figcaption>
    </figure>
  );
}

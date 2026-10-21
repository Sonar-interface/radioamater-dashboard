import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { distanceKm, fromLocator, toLocator, wavelength } from "@/lib/locator";
import { PageHeader, Panel } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/alati")({
  head: () => seo("Radioamaterski alati", "Kalkulator Maidenhead QTH lokatora, udaljenosti, valne duljine i dipol antene te prefiksi pozivnih znakova u regiji."),
  component: Page,
});

const PREFIXES = [
  ["9A", "Hrvatska"], ["S5", "Slovenija"], ["E7", "Bosna i Hercegovina"], ["YU, YT", "Srbija"],
  ["4O", "Crna Gora"], ["Z3", "Sjeverna Makedonija"], ["ZA", "Albanija"], ["HA, HG", "Mađarska"],
  ["I, IK, IZ, IW…", "Italija"], ["OE", "Austrija"], ["Z6", "Kosovo"], ["LZ", "Bugarska"],
];

function Page() {
  const [lat, setLat] = useState("45.815");
  const [lon, setLon] = useState("15.982");
  const [loc1, setLoc1] = useState("JN75");
  const [loc2, setLoc2] = useState("JN83");
  const [f, setF] = useState("145.500");
  const inp = "w-full rounded-md border border-input bg-panel px-3 py-2 font-mono";

  let locOut = "—", distOut = "—";
  try { locOut = toLocator(Number(lat), Number(lon)); } catch { /* invalid */ }
  try { distOut = `${distanceKm(fromLocator(loc1), fromLocator(loc2)).toFixed(0)} km`; } catch { /* invalid */ }
  const mhz = Number(f.replace(",", "."));
  const wl = mhz > 0 ? wavelength(mhz) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Alati" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Koordinate → QTH lokator">
          <label className="text-sm text-muted-foreground">Geografska širina</label>
          <input className={inp} value={lat} onChange={(e) => setLat(e.target.value)} />
          <label className="mt-2 block text-sm text-muted-foreground">Geografska dužina</label>
          <input className={inp} value={lon} onChange={(e) => setLon(e.target.value)} />
          <p className="mt-4 font-mono text-3xl text-primary text-glow">{locOut}</p>
          <button className="mt-3 rounded-md bg-secondary px-3 py-1.5 text-sm" onClick={() => navigator.geolocation?.getCurrentPosition((p) => { setLat(p.coords.latitude.toFixed(5)); setLon(p.coords.longitude.toFixed(5)); })}>Koristi moju lokaciju</button>
        </Panel>
        <Panel title="Udaljenost između lokatora">
          <input className={inp} value={loc1} onChange={(e) => setLoc1(e.target.value)} />
          <input className={`${inp} mt-2`} value={loc2} onChange={(e) => setLoc2(e.target.value)} />
          <p className="mt-4 font-mono text-3xl text-primary text-glow">{distOut}</p>
          <p className="text-xs text-muted-foreground">Ortodroma, od središta polja</p>
        </Panel>
        <Panel title="Frekvencija → valna duljina">
          <label className="text-sm text-muted-foreground">Frekvencija (MHz)</label>
          <input className={inp} value={f} onChange={(e) => setF(e.target.value)} />
          {wl > 0 && (
            <dl className="mt-4 space-y-1 font-mono">
              <div><dt className="inline text-muted-foreground">λ: </dt><dd className="inline text-primary">{wl.toFixed(3)} m</dd></div>
              <div><dt className="inline text-muted-foreground">λ/2 dipol (×0,95): </dt><dd className="inline">{((wl / 2) * 0.95).toFixed(3)} m</dd></div>
              <div><dt className="inline text-muted-foreground">λ/4 GP (×0,95): </dt><dd className="inline">{((wl / 4) * 0.95).toFixed(3)} m</dd></div>
            </dl>
          )}
        </Panel>
      </div>
      <Panel title="Prefiksi pozivnih znakova u regiji">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PREFIXES.map(([p, c]) => <div key={p} className="rounded-md bg-panel p-3"><span className="font-mono text-lg text-primary">{p}</span><p className="text-sm text-muted-foreground">{c}</p></div>)}
        </div>
      </Panel>
    </div>
  );
}

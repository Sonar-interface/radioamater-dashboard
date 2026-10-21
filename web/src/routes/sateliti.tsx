import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as sat from "satellite.js";
import { getAmateurTle } from "@/lib/live.functions";
import { ErrorNote, Loading, PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/sateliti")({
  head: () => seo("Amaterski sateliti i ISS – preleti nad Hrvatskom", "Izračun prelaza ISS-a i FM amaterskih satelita nad Zagrebom u stvarnom vremenu, s frekvencijama uplinka i downlinka."),
  component: Page,
});

const SATS = [
  { match: "ISS (ZARYA)", name: "ISS", freq: "Glas ↓145,800 FM · APRS 145,825 · Repetitor ↑145,990 (67 Hz) ↓437,800" },
  { match: "SO-50", name: "SO-50", freq: "↑145,850 FM (67 Hz) · ↓436,795" },
  { match: "AO-91", name: "AO-91", freq: "↑435,250 FM (67 Hz) · ↓145,960" },
  { match: "AO-7", name: "AO-7", freq: "Mod B: ↑432,125–432,175 · ↓145,975–145,925 (SSB/CW)" },
];
const QTH = { lat: 45.815, lon: 15.982, h: 0.12 }; // Zagreb

type Pass = { name: string; freq: string; start: Date; end: Date; maxEl: number };

function computePasses(tle: string): Pass[] {
  const lines = tle.split("\n").map((l) => l.trim());
  const obs = { latitude: sat.degreesToRadians(QTH.lat), longitude: sat.degreesToRadians(QTH.lon), height: QTH.h };
  const out: Pass[] = [];
  for (const s of SATS) {
    const i = lines.findIndex((l) => l.includes(s.match));
    if (i < 0 || !lines[i + 2]) continue;
    const rec = sat.twoline2satrec(lines[i + 1] ?? "", lines[i + 2] ?? "");
    let inPass = false; let start = new Date(); let maxEl = 0;
    const t0 = Date.now();
    for (let t = 0; t < 36 * 3600; t += 30) {
      const d = new Date(t0 + t * 1000);
      const pv = sat.propagate(rec, d);
      if (!pv || typeof pv.position === "boolean" || !pv.position) continue;
      const ecf = sat.eciToEcf(pv.position, sat.gstime(d));
      const el = sat.radiansToDegrees(sat.ecfToLookAngles(obs, ecf).elevation);
      if (el > 0 && !inPass) { inPass = true; start = d; maxEl = el; }
      else if (el > 0) maxEl = Math.max(maxEl, el);
      else if (inPass) { inPass = false; if (maxEl >= 10) out.push({ name: s.name, freq: s.freq, start, end: d, maxEl }); }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function Page() {
  const q = useQuery({ queryKey: ["tle"], queryFn: () => getAmateurTle(), staleTime: 3600_000 });
  const [passes, setPasses] = useState<Pass[] | null>(null);
  useEffect(() => { if (q.data) setPasses(computePasses(q.data)); }, [q.data]);
  const fmt = (d: Date) => d.toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-6">
      <PageHeader title="Sateliti" live subtitle="Preleti s elevacijom iznad 10° u sljedećih 36 sati, izračunato za Zagreb (JN75) iz svježih TLE podataka." />
      <Panel title="Frekvencije">
        <ul className="space-y-2 text-sm">{SATS.map((s) => <li key={s.name}><b className="font-display text-primary">{s.name}</b> <span className="font-mono">{s.freq}</span></li>)}</ul>
      </Panel>
      <Panel title="Sljedeći preleti (lokalno vrijeme)">
        {q.isLoading || (!passes && !q.isError) ? <Loading text="Računam putanje…" /> : q.isError ? <ErrorNote /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-2">Satelit</th><th className="p-2">Izlazak</th><th className="p-2">Zalazak</th><th className="p-2">Maks. elevacija</th></tr></thead>
            <tbody className="font-mono">{passes!.map((p, i) => (
              <tr key={i} className="border-t border-border"><td className="p-2 text-primary">{p.name}</td><td className="p-2">{fmt(p.start)}</td><td className="p-2">{fmt(p.end)}</td><td className={`p-2 ${p.maxEl > 45 ? "text-signal" : ""}`}>{p.maxEl.toFixed(0)}°</td></tr>
            ))}</tbody>
          </table>
        )}
        <Source>CelesTrak TLE, propagacija SGP4. Točnost ±1 min.</Source>
      </Panel>
    </div>
  );
}

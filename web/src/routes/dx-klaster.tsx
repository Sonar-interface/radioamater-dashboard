import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getDxSpots } from "@/lib/live.functions";
import { ErrorNote, Loading, PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dx-klaster")({
  head: () => seo("DX klaster uživo", "DX spotovi u stvarnom vremenu s filtriranjem po bandu i modu, uključujući 9A i stanice iz regije."),
  component: Page,
});

const modeOf = (c: string, f: number) => {
  const u = c.toUpperCase();
  if (/FT8|FT4|FT2/.test(u)) return "FT8/FT4";
  if (/\bCW\b/.test(u)) return "CW";
  if (/RTTY|PSK|DIGI/.test(u)) return "Digitalni";
  if (/SSB|USB|LSB/.test(u)) return "SSB";
  return f < 30000 && [14074, 7074, 21074, 28074, 3573, 10136, 18100].some((x) => Math.abs(f - x) < 3) ? "FT8/FT4" : "Ostalo";
};
const REGION = /^(9A|S5|E7|YU|YT|4O|HA|HG|Z3)/;

function Page() {
  const q = useQuery({ queryKey: ["dx"], queryFn: () => getDxSpots(), refetchInterval: 60_000 });
  const [band, setBand] = useState("Svi");
  const [mode, setMode] = useState("Svi");
  const [region, setRegion] = useState(false);
  const spots = useMemo(() => (q.data ?? []).map((s) => ({ ...s, mode: modeOf(s.comment, s.freq) }))
    .filter((s) => band === "Svi" || s.band === band)
    .filter((s) => mode === "Svi" || s.mode === mode)
    .filter((s) => !region || REGION.test(s.dx) || REGION.test(s.spotter)), [q.data, band, mode, region]);
  const bands = [...new Set((q.data ?? []).map((s) => s.band))].filter(Boolean);
  const sel = "rounded-md border border-input bg-panel px-3 py-2 text-sm";
  return (
    <div>
      <PageHeader title="DX klaster" live subtitle="Najnovijih 200 spotova, osvježavanje svake minute." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className={sel} value={band} onChange={(e) => setBand(e.target.value)}><option>Svi</option>{bands.map((b) => <option key={b}>{b}</option>)}</select>
        <select className={sel} value={mode} onChange={(e) => setMode(e.target.value)}>{["Svi", "CW", "SSB", "FT8/FT4", "Digitalni", "Ostalo"].map((m) => <option key={m}>{m}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={region} onChange={(e) => setRegion(e.target.checked)} /> Samo regija (9A, S5, E7, YU, 4O, HA, Z3)</label>
      </div>
      <Panel>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorNote /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="p-2">UTC</th><th className="p-2">kHz</th><th className="p-2">DX</th><th className="p-2">Zemlja</th><th className="p-2">Band</th><th className="p-2">Mod</th><th className="p-2">Spotter</th><th className="p-2">Komentar</th></tr></thead>
              <tbody className="font-mono">
                {spots.map((s, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/50">
                    <td className="p-2 text-muted-foreground">{s.time.slice(0, 4)}</td>
                    <td className="p-2 text-primary">{s.freq.toFixed(1)}</td>
                    <td className="p-2 font-semibold">{s.dx}</td>
                    <td className="p-2 font-sans">{s.country}</td>
                    <td className="p-2">{s.band}</td>
                    <td className="p-2 text-signal">{s.mode}</td>
                    <td className="p-2">{s.spotter}</td>
                    <td className="p-2 font-sans text-xs text-muted-foreground">{s.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {spots.length === 0 && <p className="p-4 text-muted-foreground">Nema spotova za odabrane filtre.</p>}
          </div>
        )}
        <Source>HamQTH DX Cluster</Source>
      </Panel>
    </div>
  );
}

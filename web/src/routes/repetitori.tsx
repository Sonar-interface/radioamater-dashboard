import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getRepeaters } from "@/lib/live.functions";
import { ErrorNote, Loading, Map, PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";
import { esc } from "@/lib/utils";

export const Route = createFileRoute("/repetitori")({
  head: () => seo("Repetitori u Hrvatskoj i regiji", "Popis VHF/UHF FM, DMR i C4FM repetitora u Hrvatskoj, Sloveniji, BiH, Srbiji, Crnoj Gori, Mađarskoj i sjevernoj Italiji s kartom."),
  component: Page,
});

const COUNTRIES: [string, string][] = [
  ["Croatia", "Hrvatska"], ["Slovenia", "Slovenija"], ["Bosnia", "BiH"], ["Serbia", "Srbija"],
  ["Montenegro", "Crna Gora"], ["Hungary", "Mađarska"], ["Italy", "Italija"], ["Austria", "Austrija"],
];
const countryOf = (city: string) => COUNTRIES.find(([en]) => city.includes(en))?.[1] ?? "Ostalo";
const bandOf = (f: number) => (f >= 144 && f <= 146 ? "2 m" : f >= 430 && f <= 440 ? "70 cm" : f >= 28 && f < 30 ? "10 m" : f >= 50 && f < 54 ? "6 m" : f >= 1240 && f <= 1300 ? "23 cm" : "Ostalo");

function Page() {
  const q = useQuery({ queryKey: ["rpt"], queryFn: () => getRepeaters(), staleTime: 30 * 60_000 });
  const [country, setCountry] = useState("Hrvatska");
  const [band, setBand] = useState("Svi");
  const [mode, setMode] = useState("Svi");
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      (q.data ?? [])
        .map((r) => ({ ...r, country: countryOf(r.city), band: bandOf(r.freq) }))
        .filter((r) => country === "Sve" || r.country === country)
        .filter((r) => band === "Svi" || r.band === band)
        .filter((r) => mode === "Svi" || r.mode.includes(mode))
        .filter((r) => !search || (r.callsign + r.city).toLowerCase().includes(search.toLowerCase())),
    [q.data, country, band, mode, search],
  );

  const sel = "rounded-md border border-input bg-panel px-3 py-2 text-sm";
  return (
    <div>
      <PageHeader title="Repetitori" live subtitle="Baza repetitora iz otvorene zajednice HearHam, osvježava se svakih nekoliko sati. Uvijek provjerite ton i status na terenu — podatke unose sami radioamateri." />
      <div className="mb-4 flex flex-wrap gap-3">
        <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option>Sve</option>
          {COUNTRIES.map(([, hr]) => <option key={hr}>{hr}</option>)}
        </select>
        <select className={sel} value={band} onChange={(e) => setBand(e.target.value)}>
          {["Svi", "10 m", "6 m", "2 m", "70 cm", "23 cm", "Ostalo"].map((b) => <option key={b}>{b}</option>)}
        </select>
        <select className={sel} value={mode} onChange={(e) => setMode(e.target.value)}>
          {["Svi", "FM", "DMR", "YSF"].map((b) => <option key={b}>{b}</option>)}
        </select>
        <input className={`${sel} flex-1`} placeholder="Traži pozivni znak ili mjesto…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {q.isLoading ? <Loading text="Učitavam bazu repetitora…" /> : q.isError ? <ErrorNote /> : (
        <div className="space-y-6">
          <Map markers={rows.map((r) => ({ lat: r.lat, lng: r.lon, popup: `<b>${esc(r.callsign)}</b><br/>${r.freq.toFixed(4)} MHz ${esc(r.mode)}<br/>${esc(r.city)}` }))} />
          <Panel title={`${rows.length} repetitora`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="p-2">Pozivni</th><th className="p-2">Izlaz (MHz)</th><th className="p-2">Pomak</th><th className="p-2">Ulaz</th><th className="p-2">Ton / CC</th><th className="p-2">Mod</th><th className="p-2">Mreža</th><th className="p-2">Lokacija</th><th className="p-2">Status</th></tr>
                </thead>
                <tbody className="font-mono">
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="p-2 font-semibold text-primary">{r.callsign}</td>
                      <td className="p-2">{r.freq.toFixed(4)}</td>
                      <td className="p-2">{r.offset === 0 ? "simpleks" : `${r.offset > 0 ? "+" : ""}${r.offset.toFixed(3)}`}</td>
                      <td className="p-2">{(r.freq + r.offset).toFixed(4)}</td>
                      <td className="p-2">{r.tone || "—"}</td>
                      <td className="p-2">{r.mode}</td>
                      <td className="p-2 font-sans text-xs">{r.network}</td>
                      <td className="p-2 font-sans">{r.city}</td>
                      <td className="p-2">{r.operational ? <span className="text-signal">aktivan</span> : <span className="text-warn">neaktivan</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Source><a className="text-primary underline" href="https://hearham.com" target="_blank" rel="noreferrer">HearHam.com</a> (otvoreni podaci zajednice). Službene popise vodi HRS – <a className="text-primary underline" href="https://www.hamradio.hr" target="_blank" rel="noreferrer">hamradio.hr</a>.</Source>
          </Panel>
        </div>
      )}
    </div>
  );
}

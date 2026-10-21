import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAirportFreqs, getMetars } from "@/lib/live.functions";
import { ErrorNote, Loading, PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/zrakoplovstvo")({
  head: () => seo("Frekvencije zračnih luka i METAR", "Frekvencije TWR, APP, GND i ATIS za zračne luke u Hrvatskoj i regiji te METAR/TAF vremenska izvješća uživo."),
  component: Page,
});

const AIRPORTS: { icao: string; name: string; country: string }[] = [
  { icao: "LDZA", name: "Zagreb – Franjo Tuđman", country: "HR" },
  { icao: "LDSP", name: "Split", country: "HR" },
  { icao: "LDDU", name: "Dubrovnik", country: "HR" },
  { icao: "LDZD", name: "Zadar", country: "HR" },
  { icao: "LDPL", name: "Pula", country: "HR" },
  { icao: "LDRI", name: "Rijeka (Krk)", country: "HR" },
  { icao: "LDOS", name: "Osijek", country: "HR" },
  { icao: "LDSB", name: "Brač", country: "HR" },
  { icao: "LDLO", name: "Mali Lošinj", country: "HR" },
  { icao: "LJLJ", name: "Ljubljana", country: "SI" },
  { icao: "LJMB", name: "Maribor", country: "SI" },
  { icao: "LQSA", name: "Sarajevo", country: "BA" },
  { icao: "LQMO", name: "Mostar", country: "BA" },
  { icao: "LQBK", name: "Banja Luka", country: "BA" },
  { icao: "LQTZ", name: "Tuzla", country: "BA" },
  { icao: "LYBE", name: "Beograd", country: "RS" },
  { icao: "LYNI", name: "Niš", country: "RS" },
  { icao: "LYPG", name: "Podgorica", country: "ME" },
  { icao: "LYTV", name: "Tivat", country: "ME" },
  { icao: "LHBP", name: "Budimpešta", country: "HU" },
  { icao: "LIPZ", name: "Venecija", country: "IT" },
  { icao: "LIPQ", name: "Trst", country: "IT" },
];
const ORDER = ["ATIS", "DEL", "GND", "TWR", "APP", "RDR", "INFO"];
const catColor = (c: string | null) => (c === "VFR" ? "bg-signal/15 text-signal" : c === "MVFR" ? "bg-chart-3/20 text-chart-3" : c ? "bg-warn/15 text-warn" : "bg-muted");

function Page() {
  const [country, setCountry] = useState("HR");
  const freqs = useQuery({ queryKey: ["afreq"], queryFn: () => getAirportFreqs(), staleTime: 3600_000 });
  const ids = AIRPORTS.map((a) => a.icao);
  const wx = useQuery({ queryKey: ["wx", ids], queryFn: () => getMetars({ data: { ids } }), refetchInterval: 5 * 60_000 });
  const list = AIRPORTS.filter((a) => country === "Sve" || a.country === country);

  return (
    <div className="space-y-6">
      <PageHeader title="Zrakoplovstvo" live subtitle="Frekvencije zračnog prometa (118–137 MHz, AM) i vremenska izvješća. Slušanje je dozvoljeno, emitiranje nije." />
      <p className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">⚠️ Samo za informaciju – nije za navigaciju. Službeni izvor: AIP Hrvatske (Hrvatska kontrola zračne plovidbe, crocontrol.hr). Opća frekvencija za nuždu: <b className="font-mono">121,500 MHz</b>.</p>
      <div className="flex flex-wrap gap-2">
        {["HR", "SI", "BA", "RS", "ME", "HU", "IT", "Sve"].map((c) => (
          <button key={c} onClick={() => setCountry(c)} className={`rounded-md px-3 py-1.5 font-mono text-sm ${country === c ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{c}</button>
        ))}
      </div>
      {freqs.isLoading ? <Loading /> : freqs.isError ? <ErrorNote /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => {
            const f = (freqs.data ?? []).filter((x) => x.ident === a.icao).sort((x, y) => (ORDER.indexOf(x.type) + 99) % 99 - (ORDER.indexOf(y.type) + 99) % 99);
            const m = wx.data?.metars.find((x) => x.icaoId === a.icao);
            const taf = wx.data?.tafs[a.icao];
            return (
              <Panel key={a.icao}>
                <div className="flex items-start justify-between gap-2">
                  <div><h2 className="font-display text-xl font-bold">{a.name}</h2><p className="font-mono text-primary">{a.icao}</p></div>
                  {m && <span className={`rounded-md px-2 py-1 font-mono text-xs ${catColor(m.fltCat)}`}>{m.fltCat ?? "—"}</span>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {f.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Nema podataka o frekvencijama.</p>}
                  {f.map((x, i) => (
                    <div key={i} className="rounded-md bg-panel p-2">
                      <p className="text-xs text-muted-foreground">{x.type}{x.description && x.description !== x.type ? ` · ${x.description}` : ""}</p>
                      <p className="font-mono text-lg text-primary">{x.mhz.toFixed(3)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 font-mono text-xs">
                  {wx.isLoading ? <p className="text-muted-foreground">METAR se učitava…</p> : m ? <p><span className="text-signal">METAR</span> {m.rawOb}</p> : <p className="text-muted-foreground">METAR nije dostupan.</p>}
                  {taf && <p className="text-muted-foreground"><span className="text-primary">TAF</span> {taf}</p>}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <Source>Frekvencije: OurAirports (otvoreni podaci, osvježavaju se dnevno). METAR/TAF: aviationweather.gov, svakih 5 min.</Source>
    </div>
  );
}

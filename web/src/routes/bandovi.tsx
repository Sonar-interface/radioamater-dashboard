import { createFileRoute } from "@tanstack/react-router";
import { BANDS, EMERGENCY_COA } from "@/data/bandplan";
import { PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/bandovi")({
  head: () => seo("HAM bandovi i IARU R1 bandplan", "Radioamaterski bandovi od 160 m do 23 cm prema IARU Regiji 1, s oznakom što smiju razredi dozvole A i P u Hrvatskoj."),
  component: Page,
});

const segColor = (u: string) =>
  u.startsWith("CW") ? "bg-chart-3" : u.includes("igital") || u.includes("APRS") || u.includes("Uskopojasni") ? "bg-signal" : u.includes("vjetion") ? "bg-chart-5" : u.includes("Satel") ? "bg-chart-4" : "bg-primary";

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="HAM bandovi" subtitle="Bandplan IARU Regije 1 (Europa) s oznakama za razrede dozvole A i P. Hrvatska primjenjuje CEPT preporuke T/R 61-01 (HAREC) i ECC/REC(05)06 (početnička razina)." />

      <Panel title="Razredi dozvole u Hrvatskoj">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-panel p-4">
            <p className="font-display text-xl text-primary">Razred A</p>
            <p className="mt-1 text-sm text-muted-foreground">Puna dozvola (CEPT T/R 61-01 / HAREC). Svi radioamaterski bandovi, svi modovi, najveće dopuštene snage prema Pravilniku. Vrijedi za rad u CEPT zemljama.</p>
          </div>
          <div className="rounded-lg bg-panel p-4">
            <p className="font-display text-xl text-signal">Razred P</p>
            <p className="mt-1 text-sm text-muted-foreground">Početnička dozvola (ECC/REC(05)06). Ograničen izbor bandova i snage. Oznake niže okvirno prate CEPT preporuku – točan opseg i snage za razred P propisuje važeći HAKOM Pravilnik.</p>
          </div>
        </div>
        <p className="mt-4 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">⚠️ Prije emitiranja provjerite aktualni Pravilnik o amaterskoj radijskoj službi i Tablicu namjene radiofrekvencijskog spektra na <a className="text-primary underline" href="https://www.hakom.hr" target="_blank" rel="noreferrer">hakom.hr</a>.</p>
      </Panel>

      <div className="grid gap-4">
        {BANDS.map((b) => {
          const min = b.segments[0]!.from;
          const max = b.segments[b.segments.length - 1]!.to;
          return (
            <Panel key={b.band}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">{b.band}</h2>
                  <p className="font-mono text-primary">{b.range}</p>
                </div>
                <div className="flex gap-2 font-mono text-sm">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${b.classA ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>A {b.classA ? <Check className="size-4" /> : <X className="size-4" />}</span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${b.classP ? "bg-signal/15 text-signal" : "bg-muted text-muted-foreground"}`}>P {b.classP ? <Check className="size-4" /> : <X className="size-4" />}</span>
                </div>
              </div>
              <div className="mt-4 flex h-8 overflow-hidden rounded-md">
                {b.segments.map((s) => (
                  <div key={s.from} title={`${s.from}–${s.to} ${b.unit}: ${s.use}`} className={`${segColor(s.use)} border-r border-background opacity-80 hover:opacity-100`} style={{ width: `${((s.to - s.from) / (max - min)) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {b.segments.map((s) => (
                  <li key={s.from} className="flex gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${segColor(s.use)}`} /><span className="font-mono text-muted-foreground">{s.from}–{s.to}</span> {s.use}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm"><span className="text-muted-foreground">Ključne frekvencije:</span> <span className="font-mono">{b.key}</span></p>
              {b.note && <p className="mt-1 text-xs text-warn">{b.note}</p>}
            </Panel>
          );
        })}
      </div>

      <Panel title="Hitne komunikacije (IARU R1 centri aktivnosti)">
        <div className="flex flex-wrap gap-2 font-mono">
          {EMERGENCY_COA.map((f) => <span key={f} className="rounded-md bg-warn/15 px-3 py-1 text-warn">{f}</span>)}
        </div>
        <Source>IARU Regija 1 – HF i VHF/UHF bandplan</Source>
      </Panel>
    </div>
  );
}

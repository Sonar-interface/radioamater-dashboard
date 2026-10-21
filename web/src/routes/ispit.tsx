import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel } from "@/components/site";
import { QUESTIONS, STAGES, type Q } from "@/data/ispit";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/ispit")({
  head: () => seo("Priprema za ispit (A i P razred)", "Vježbovna pitanja za radioamaterski ispit u Hrvatskoj po fazama: propisi, tehnika i postupci, s objašnjenjima."),
  component: Page,
});

// Ponovljivo miješanje odgovora da točan odgovor nije uvijek na istom mjestu.
function shuffled(q: Q, seed: number) {
  const idx = q.a.map((_, i) => i);
  let s = seed + q.q.length * 7919;
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j] as number, idx[i] as number];
  }
  return idx;
}

function Page() {
  const [cls, setCls] = useState<"svi" | "A" | "P">("svi");
  const [stage, setStage] = useState(0);
  const [seed, setSeed] = useState(1);
  const [picked, setPicked] = useState<Record<string, number>>({});

  const qs = useMemo(
    () => QUESTIONS.filter((x) => (stage === 0 || x.s === stage) && (cls === "svi" || x.c === "svi" || x.c === cls)),
    [cls, stage],
  );
  const answered = qs.filter((q) => picked[q.q] !== undefined);
  const right = answered.filter((q) => picked[q.q] === q.c_).length;

  const pill = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-primary text-foreground" : "border-border text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Priprema za ispit"
        subtitle="Vježbovna pitanja za A i P razred, po fazama učenja. Kliknite odgovor: točan se označi zeleno, uz kratko objašnjenje."
      />
      <p className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
        ⚠️ Pitanja nisu službena. Službena pitanja i pravila određuju HAKOM i ispitno povjerenstvo. Svako pitanje provjerite u važećem
        Pravilniku o amaterskoj radijskoj službi (NN 150/2022).
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Razred:</span>
        {(["svi", "A", "P"] as const).map((c) => (
          <button key={c} className={pill(cls === c)} onClick={() => setCls(c)}>{c === "svi" ? "Svi" : c}</button>
        ))}
        <span className="ml-4 text-sm text-muted-foreground">Faza:</span>
        {[0, 1, 2, 3].map((s) => (
          <button key={s} className={pill(stage === s)} onClick={() => setStage(s)}>{s === 0 ? "Sve" : `${s} · ${STAGES[s]}`}</button>
        ))}
        <button className="ml-auto rounded-md bg-secondary px-3 py-1.5 text-sm" onClick={() => { setPicked({}); setSeed((x) => x + 1); }}>
          Ispočetka (promiješaj)
        </button>
      </div>

      <p className="font-mono text-primary">
        {answered.length ? `Rezultat: ${right} / ${answered.length} točnih · ukupno ${qs.length} pitanja` : `Pitanja: ${qs.length}`}
      </p>

      <div className="space-y-3">
        {qs.map((q, i) => {
          const p = picked[q.q];
          const done = p !== undefined;
          return (
            <Panel key={q.q}>
              <p className="font-medium">
                <span className="mr-2 font-mono text-primary">{i + 1}.</span>
                {q.q}
                <span className="ml-2 rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {STAGES[q.s]} · {q.c === "svi" ? "A i P" : q.c}
                </span>
              </p>
              <div className="mt-3 grid gap-2">
                {shuffled(q, seed).map((j) => {
                  const ok = done && j === q.c_;
                  const bad = done && j === p && j !== q.c_;
                  return (
                    <button
                      key={j}
                      disabled={done}
                      onClick={() => setPicked((x) => ({ ...x, [q.q]: j }))}
                      className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                        ok ? "border-signal bg-signal/10" : bad ? "border-warn bg-warn/10" : "border-border hover:border-primary"
                      }`}
                    >
                      {q.a[j]}
                    </button>
                  );
                })}
              </div>
              {done && <p className="mt-3 text-sm text-muted-foreground">{q.e}</p>}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

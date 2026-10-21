import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel } from "@/components/site";
import { QUESTIONS, STAGES, type Q } from "@/data/ispit";
import { KLJUC } from "@/data/ispit_kljuc";

const ALL: Q[] = [...KLJUC, ...QUESTIONS.map((q) => ({ ...q, src: "vjezba" }))];
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

const CHEAT = [
  "U = I × R · P = U × I · v = f × λ · λ[m] = 300 / f[MHz]",
  "160 m = 1,8 MHz · 80 m = 3,5 · 40 m = 7 · 20 m = 14 · 15 m = 21 · 10 m = 28 MHz",
  "Snaga: A razred 1500 W PEP · P razred 100 W PEP",
  "Impedancija: 50 Ω (koaks, priključak) · TV koaks 75 Ω · simetrični vod 300 Ω",
  "dB: 3 dB → 2× · 6 dB → 4× · 10 dB → 10×",
  "Ionosfera: D upija; E, F1, F2 odbijaju; noću ostaje samo F2",
  "LSB: 160/80/40 m · USB: 20 m i kraće + UKV · FM: UKV",
  "RTTY 45,45 Bd · repetitor ID u F2A/G2A najmanje svakih 20 min",
  "Repetitor ERP ≤ 15 W, devijacija ≤ ±5 kHz",
  "Radiofar: 50 / 10 / 1 W (međunarodni / državni / lokalni)",
  "ARG: ≤ 5 W ispod 30 MHz, ≤ 10 W iznad 30 MHz",
  "Pozivni: 9A + znamenka + najviše 3 slova · /M /MM /AM /P",
  "Pozivni na početku i kraju veze te svakih 10 min",
  "Dnevnik: UTC početak/kraj, frekvencija, emisija, snaga, lokacija, pozivni; čuvati ≥ 12 mjeseci (NN 150/22)",
  "Štetna smetnja → odmah prestati s radom i ukloniti je",
  "SOS / MAYDAY radioamater ne koristi; primljen poziv u pomoć → odmah prekinuti rad i pomoći",
  "RST: R 1–5, S 1–9 (+dB), T 1–9 · najbolje 599 · telefonija samo RS (59)",
  "Hrvatska: IARU regija 1 · ITU regija 1 · WAZ zona 15 · lokator JN75 (Zagreb JN75XT)",
  "QSO veza · CQ opći poziv · DE od · 73 pozdrav · UTC svjetsko vrijeme",
  "XYL supruga · YL operaterka · OM operater · SWL slušatelj · DX daleka veza",
  "QRP mala snaga · QRO veća snaga · QRS sporije · QRT kraj rada",
  "QRM smetnje od postaja · QRN atmosferske smetnje · QSB fading",
  "Etika: obziran, lojalan, napredan, ljubazan, uravnotežen, domoljub",
];

function Page() {
  const [cls, setCls] = useState<"svi" | "A" | "P">("svi");
  const [stage, setStage] = useState(0);
  const [seed, setSeed] = useState(1);
  const [src, setSrc] = useState<"kljuc" | "vjezba" | "sve">("kljuc");
  const [picked, setPicked] = useState<Record<string, number>>({});

  // A razred obuhvaća i gradivo P razreda; P razred vidi samo P i zajednička pitanja.
  const qs = useMemo(
    () =>
      ALL.filter(
        (x) =>
          (src === "sve" || x.src === src) &&
          (stage === 0 || x.s === stage) &&
          (cls === "svi" || x.c === "svi" || x.c === cls || (cls === "A" && x.c === "P")),
      ),
    [cls, stage, src],
  );
  const answered = qs.filter((q) => picked[q.q] !== undefined);
  const right = answered.filter((q) => picked[q.q] === q.c_).length;

  const pill = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-primary text-foreground" : "border-border text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Priprema za ispit"
        subtitle="Ispitna pitanja s ključevima za P i A razred i dodatna vježbovna pitanja, po fazama. Kliknite odgovor: točan se označi zeleno."
      />
      <p className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
        ⚠️ Odgovori su prema ključevima iz materijala za tečaj. Gdje ključ odstupa od Pravilnika NN 150/22, uz odgovor je narančasta napomena: tada provjerite s klubom ili ispitnim povjerenstvom. Dodatna vježbovna pitanja nisu službena.
      </p>

      <details className="rounded-xl border border-border bg-card/80 p-5">
        <summary className="cursor-pointer font-display text-lg font-semibold">Brzi pregled za ponavljanje</summary>
        <ul className="mt-3 grid gap-1.5 text-sm md:grid-cols-2">
          {CHEAT.map((x) => (
            <li key={x} className="rounded-md bg-panel px-3 py-2 font-mono text-xs leading-relaxed">{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Iz dokumenta „Pregled za radioamaterski ispit“. Provjeriti uz Pravilnik NN 150/22.</p>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Pitanja:</span>
        {([["kljuc", "Ispitna (s ključem)"], ["vjezba", "Dodatna vježba"], ["sve", "Sva"]] as const).map(([k, l]) => (
          <button key={k} className={pill(src === k)} onClick={() => setSrc(k)}>{l}</button>
        ))}
      </div>

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
                  {STAGES[q.s]} · {q.c === "svi" ? "A i P" : `${q.c} razred`}
                  {q.ref ? ` · ${q.ref}` : ""}
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
              {done && q.warn && (
                <p className="mt-2 rounded-md border border-warn/40 bg-warn/10 p-2 text-sm">⚠️ {q.warn}</p>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { getLive, getMeshNodes, getRepeaters } from "@/lib/live.functions";
import { ErrorNote, Loading, PageHeader, Panel, Source } from "@/components/site";
import { bandOf, bearingDeg, compass, distanceKm, inRegion } from "@/lib/geo";
import { seo } from "@/lib/seo";

const LiveMap = lazy(() => import("@/components/LiveMap"));

export const Route = createFileRoute("/karta")({
  head: () => seo("Karta uživo", "PSKReporter spotovi, Meshtastic čvorovi i repetitori na karti Hrvatske i susjednih zemalja, osvježavano svakih 10 minuta."),
  component: Page,
});

const touchesRegion = (ll: [number, number] | null) => !!ll && inRegion(ll[0], ll[1]);

function Page() {
  const live = useQuery({ queryKey: ["live"], queryFn: () => getLive(), refetchInterval: 2 * 60_000 });
  const mesh = useQuery({ queryKey: ["mesh"], queryFn: () => getMeshNodes(), refetchInterval: 5 * 60_000 });
  const rpt = useQuery({ queryKey: ["rpt"], queryFn: () => getRepeaters(), staleTime: 30 * 60_000 });
  const [mode, setMode] = useState("svi");
  const [all, setAll] = useState(false);

  const spots = live.data?.spots ?? [];
  const modes = useMemo(() => [...new Set(spots.map((s) => s.mode).filter(Boolean) as string[])].sort(), [spots]);
  const shown = useMemo(
    () => spots.filter((s) => (mode === "svi" || s.mode === mode) && (all || touchesRegion(s.txLatLon) || touchesRegion(s.rxLatLon))),
    [spots, mode, all],
  );
  const table = useMemo(() => [...shown].sort((a, b) => (b.t ?? 0) - (a.t ?? 0)).slice(0, 150), [shown]);
  const mqttNodes = live.data?.nodes ?? [];
  const mqttWithPos = mqttNodes.filter((n) => typeof n.lat === "number");

  const st = live.data?.status ?? {};
  const updated = live.data?.updated ? new Date(live.data.updated).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" }) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karta uživo"
        live
        subtitle="Kliknite na točku ili liniju za detalje: pozivni znakovi, frekvencija, pojas, mod, SNR, udaljenost i azimut. Slojeve uključujete i isključujete u izborniku desno na karti."
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-md border border-border bg-panel px-3 py-1.5 font-mono">
          <option value="svi">Svi modovi</option>
          {modes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          Prikaži spotove iz cijelog svijeta (zadano: samo oni koji diraju regiju)
        </label>
        <span className="font-mono text-muted-foreground">
          {shown.length} / {spots.length} spotova · {mqttWithPos.length} MQTT čvorova s pozicijom · {mesh.data?.length ?? 0} meshmap čvorova · {rpt.data?.length ?? 0} repetitora
        </span>
      </div>

      {live.isLoading ? (
        <Loading />
      ) : (
        <ClientOnly fallback={<div style={{ height: 620 }} className="rounded-xl bg-panel" />}>
          <Suspense fallback={<div style={{ height: 620 }} className="rounded-xl bg-panel" />}>
            <LiveMap spots={shown} mqttNodes={mqttWithPos} meshNodes={mesh.data ?? []} repeaters={rpt.data ?? []} />
          </Suspense>
        </ClientOnly>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Stanje izvora" className="min-w-0 lg:col-span-1">
          {live.isError ? (
            <ErrorNote text="Podaci još nisu skupljeni. Prvo pokretanje traje do 10 minuta." />
          ) : (
            <>
              <p className="mb-3 font-mono text-sm">Osvježeno: <span className="text-primary">{updated}</span></p>
              <ul className="space-y-1 font-mono text-xs">
                {Object.entries(st).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3 border-b border-border pb-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={String(v).startsWith("greška") ? "text-warn" : "text-signal"}>{String(v)}</span>
                  </li>
                ))}
              </ul>
              {(live.data?.errors.length ?? 0) > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-warn">Zadnje greške ({live.data?.errors.length})</summary>
                  <ul className="mt-2 space-y-1 font-mono text-muted-foreground">
                    {live.data?.errors.slice(-8).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Meshtastic: dekriptiraju se samo paketi na zadanom javnom kanalu (LongFast, zadani ključ). Privatni kanali se ne vide.
              </p>
            </>
          )}
        </Panel>

        <Panel title={`Spotovi (${table.length} najnovijih)`} className="min-w-0 lg:col-span-2">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Vrijeme</th><th className="p-2">Predajnik</th><th className="p-2">Prijemnik</th>
                  <th className="p-2">MHz</th><th className="p-2">Pojas</th><th className="p-2">Mod</th><th className="p-2">SNR</th><th className="p-2">km</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {table.map((s, i) => {
                  const d = s.txLatLon && s.rxLatLon ? { lat: s.txLatLon[0], lon: s.txLatLon[1] } : null;
                  const e = s.txLatLon && s.rxLatLon ? { lat: s.rxLatLon[0], lon: s.rxLatLon[1] } : null;
                  const km = d && e ? Math.round(distanceKm(d, e)) : null;
                  const az = d && e ? compass(bearingDeg(d, e)) : "";
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2 text-xs text-muted-foreground">{s.t ? new Date(s.t * 1000).toLocaleTimeString("hr-HR", { timeZone: "Europe/Zagreb" }) : "—"}</td>
                      <td className="p-2 text-primary">{s.tx}</td>
                      <td className="p-2">{s.rx}</td>
                      <td className="p-2">{s.freqHz ? (s.freqHz / 1e6).toFixed(4) : "—"}</td>
                      <td className="p-2">{bandOf(s.freqHz)}</td>
                      <td className="p-2">{s.mode}</td>
                      <td className="p-2">{s.snr}</td>
                      <td className="p-2" title={az ? `Azimut ${az}` : ""}>{km != null ? `${km.toLocaleString("hr-HR")} ${az}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Source>PSKReporter (zadnjih 15 min, osvježava se svakih 5–10 min), javni Meshtastic MQTT, meshmap.net, HearHam</Source>
        </Panel>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getLive, getMeshNodes } from "@/lib/live.functions";
import { ErrorNote, Loading, PageHeader, Panel, Source } from "@/components/site";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const LiveMap = lazy(() => import("@/components/LiveMap"));
import { seo } from "@/lib/seo";
import { esc } from "@/lib/utils";

export const Route = createFileRoute("/lora")({
  head: () => seo("LoRa i Meshtastic u Hrvatskoj", "LoRa frekvencije EU868 i EU433, LoRa APRS 433,775 MHz, Meshtastic preseti i karta aktivnih čvorova u regiji uživo."),
  component: Page,
});

const PRESETS = [
  ["LongFast", "250", "11", "4/5", "Zadano, veliki domet"],
  ["LongModerate", "125", "11", "4/8", "Veći domet, sporije"],
  ["LongSlow", "125", "12", "4/8", "Najveći domet, najsporije"],
  ["MediumSlow", "250", "10", "4/5", "Kompromis"],
  ["MediumFast", "250", "9", "4/5", "Gušće mreže"],
  ["ShortSlow", "250", "8", "4/5", "Kratki domet"],
  ["ShortFast", "250", "7", "4/5", "Gradske mreže"],
  ["ShortTurbo", "500", "7", "4/5", "Najbrže (provjerite propise)"],
];

function Page() {
  const q = useQuery({ queryKey: ["mesh"], queryFn: () => getMeshNodes(), refetchInterval: 5 * 60_000 });
  const live = useQuery({ queryKey: ["live"], queryFn: () => getLive(), refetchInterval: 2 * 60_000 });
  const mqtt = (live.data?.nodes ?? []).filter((n) => typeof n.lat === "number" && typeof n.lon === "number" && n.lat > 41.8 && n.lat < 48.6 && n.lon > 12 && n.lon < 23.5);
  return (
    <div className="space-y-6">
      <PageHeader title="LoRa / Meshtastic" live subtitle="LoRa radi u nelicenciranim ISM/SRD pojasevima (ERC/REC 70-03), a LoRa APRS u radioamaterskom pojasu 70 cm." />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="EU868">
          <p className="font-mono text-2xl text-primary">863 – 870 MHz</p>
          <p className="mt-2 text-sm text-muted-foreground">Meshtastic zadano: <b className="font-mono">869,525 MHz</b> (podpojas 869,40–869,65 MHz), do 500 mW ERP, radni ciklus 10 %. Ostali podpojasevi uglavnom 25 mW i 1 %.</p>
        </Panel>
        <Panel title="EU433">
          <p className="font-mono text-2xl text-primary">433,05 – 434,79 MHz</p>
          <p className="mt-2 text-sm text-muted-foreground">SRD bez dozvole: do 10 mW ERP, radni ciklus 10 %. Preklapa se s radioamaterskim pojasom 70 cm.</p>
        </Panel>
        <Panel title="LoRa APRS">
          <p className="font-mono text-2xl text-signal">433,775 MHz</p>
          <p className="mt-2 text-sm text-muted-foreground">SF12, BW 125 kHz, CR 4/5. Samo za licencirane radioamatere (A ili P) uz pozivni znak.</p>
        </Panel>
      </div>

      <Panel title="Meshtastic preseti">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-2">Preset</th><th className="p-2">BW (kHz)</th><th className="p-2">SF</th><th className="p-2">CR</th><th className="p-2">Namjena</th></tr></thead>
            <tbody className="font-mono">{PRESETS.map((p) => <tr key={p[0]} className="border-t border-border">{p.map((c, i) => <td key={i} className={`p-2 ${i === 0 ? "text-primary" : ""} ${i === 4 ? "font-sans" : ""}`}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <Source>meshtastic.org dokumentacija</Source>
      </Panel>

      <Panel title={q.data ? `Aktivni Meshtastic čvorovi u regiji (${q.data.length}, zadnjih 48 h)` : "Aktivni Meshtastic čvorovi"}>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorNote /> : (
          <>
            <ClientOnly fallback={<div style={{ height: 520 }} className="rounded-xl bg-panel" />}>
              <Suspense fallback={<div style={{ height: 520 }} className="rounded-xl bg-panel" />}>
                <LiveMap spots={[]} repeaters={[]} mqttNodes={mqtt} meshNodes={q.data ?? []} height={520} />
              </Suspense>
            </ClientOnly>
            <p className="mt-2 text-xs text-muted-foreground">Ljubičasto: čvorovi koje naš kolektor čuje izravno na javnom MQTT-u ({mqtt.length}). Narančasto: meshmap.net. Prikazani su samo čvorovi koji šalju poziciju; stvarni broj je veći.</p>
          </>
        )}
        <Source><a className="text-primary underline" href="https://meshmap.net" target="_blank" rel="noreferrer">meshmap.net</a>, osvježavanje svakih 5 min</Source>
      </Panel>

      <Panel title="Za početnike">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Nabavite uređaj za EU868 (npr. Heltec V3, LilyGO T-Beam, RAK WisBlock) s pripadnom antenom.</li>
          <li>Instalirajte firmware preko flasher.meshtastic.org i povežite aplikaciju (Android/iOS) preko Bluetootha.</li>
          <li>Postavite regiju <b>EU_868</b> i preset koji koristi lokalna zajednica (provjerite na karti iznad).</li>
          <li>Antenu postavite što više – domet LoRa signala ovisi ponajprije o optičkoj vidljivosti.</li>
        </ol>
      </Panel>
    </div>
  );
}

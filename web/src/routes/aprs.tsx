import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/aprs")({
  head: () => seo("APRS uživo – Hrvatska i regija", "Karta APRS stanica uživo nad Hrvatskom, frekvencije 144,800 MHz i LoRa APRS 433,775 MHz."),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="APRS uživo" live subtitle="Automatic Packet Reporting System – pozicije, telemetrija, meteo stanice i poruke radioamatera." />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="VHF APRS"><p className="font-mono text-2xl text-primary">144,800 MHz</p><p className="text-sm text-muted-foreground">AFSK 1200 bd, cijela Europa</p></Panel>
        <Panel title="LoRa APRS"><p className="font-mono text-2xl text-signal">433,775 MHz</p><p className="text-sm text-muted-foreground">SF12 / BW125 / CR4/5</p></Panel>
        <Panel title="ISS digipeater"><p className="font-mono text-2xl text-primary">145,825 MHz</p><p className="text-sm text-muted-foreground">Putanja ARISS, preko ISS-a</p></Panel>
      </div>
      <Panel title="Karta stanica">
        <iframe title="APRS karta" src="https://aprs.fi/#!lat=44.6&lng=16.4&z=7" className="h-[600px] w-full rounded-xl border border-border" loading="lazy" />
        <p className="mt-2 text-sm">Ako se karta ne prikazuje, otvorite je izravno: <a className="text-primary underline" href="https://aprs.fi/#!lat=44.6&lng=16.4&z=7" target="_blank" rel="noreferrer">aprs.fi</a> · LoRa: <a className="text-primary underline" href="https://lora-aprs.live" target="_blank" rel="noreferrer">lora-aprs.live</a></p>
        <Source>aprs.fi (OH7LZB), APRS-IS mreža</Source>
      </Panel>
    </div>
  );
}

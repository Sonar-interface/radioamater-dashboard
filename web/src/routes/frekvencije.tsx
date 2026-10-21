import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/frekvencije")({
  head: () => seo("Ostale korisne frekvencije", "PMR446, CB 27 MHz, hitne komunikacije, vremenski signali i satelitske frekvencije za slušatelje i radioamatere."),
  component: Page,
});

const pmr = Array.from({ length: 16 }, (_, i) => [String(i + 1), (446.00625 + i * 0.0125).toFixed(5)]);
const CB = [["1", "26,965"], ["9", "27,065 – hitni kanal"], ["19", "27,185 – promet / ceste"], ["40", "27,405"]];

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Ostale korisne frekvencije" subtitle="Frekvencije bez potrebe za radioamaterskom dozvolom te hitni i referentni signali." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="PMR446 (bez dozvole, 0,5 W ERP)">
          <div className="grid grid-cols-4 gap-2 font-mono text-sm">
            {pmr.map(([c, f]) => <div key={c} className="rounded-md bg-panel p-2"><span className="text-muted-foreground">K{c}</span><br /><span className="text-primary">{f}</span></div>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Kanali 1–8 analogni od početka; 9–16 dodani 2018. Fiksna antena nije dozvoljena.</p>
        </Panel>
        <Panel title="CB radio 27 MHz (40 kanala)">
          <ul className="space-y-2 font-mono text-sm">{CB.map(([c, f]) => <li key={c}><span className="text-primary">K{c}</span> {f} MHz</li>)}</ul>
          <p className="mt-2 text-sm text-muted-foreground">26,965–27,405 MHz, FM/AM 4 W, SSB 12 W PEP (CEPT ECC/DEC(11)03).</p>
        </Panel>
        <Panel title="Hitne komunikacije">
          <ul className="space-y-2 text-sm">
            <li><b className="font-mono text-warn">112</b> – jedinstveni europski broj za hitne slučajeve</li>
            <li><b className="font-mono text-warn">121,500 MHz</b> – zrakoplovna frekvencija za nuždu</li>
            <li><b className="font-mono text-warn">406 MHz</b> – COSPAS-SARSAT EPIRB/PLB odašiljači</li>
            <li><b className="font-mono text-warn">156,800 MHz</b> – pomorski kanal 16</li>
            <li><b className="font-mono text-warn">3760 / 7110 kHz</b> – IARU R1 radioamaterske hitne komunikacije</li>
          </ul>
        </Panel>
        <Panel title="Vremenski signali i referentne postaje">
          <ul className="space-y-2 text-sm">
            <li><b className="font-mono text-primary">77,5 kHz</b> – DCF77 (Mainflingen, DE)</li>
            <li><b className="font-mono text-primary">5 / 10 / 15 MHz</b> – WWV/WWVH (SAD), standardne frekvencije</li>
            <li><b className="font-mono text-primary">14100 kHz</b> (i 18110, 21150, 24930, 28200) – NCDXF/IARU svjetionici</li>
          </ul>
        </Panel>
        <Panel title="Satelitske frekvencije (slušanje)">
          <ul className="space-y-2 text-sm">
            <li><b className="font-mono text-primary">137,1 / 137,9 MHz</b> – NOAA/Meteor meteorološki sateliti (APT/LRPT)</li>
            <li><b className="font-mono text-primary">145,800 MHz</b> – ISS glas i SSTV</li>
            <li><b className="font-mono text-primary">1691 MHz</b> – HRPT meteorološki sateliti</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Napomena: NOAA 15/18/19 isključeni su 2025.; Meteor-M i dalje emitira LRPT na 137 MHz.</p>
        </Panel>
      </div>
      <Source>ETSI, ERC/REC 70-03, ITU, IARU</Source>
    </div>
  );
}

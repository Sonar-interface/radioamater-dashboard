import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Source } from "@/components/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/pomorstvo")({
  head: () => seo("Pomorske VHF frekvencije – Jadran", "Pomorski VHF kanali, kanal 16, DSC 70, vremenske prognoze za pomorce, NAVTEX i hitni brojevi za Jadran."),
  component: Page,
});

const CH = [
  ["16", "156,800", "Pogibelj, sigurnost i pozivanje – stalno slušanje"],
  ["70", "156,525", "DSC digitalni selektivni poziv (samo podaci)"],
  ["06", "156,300", "Brod–brod, sigurnost, SAR koordinacija"],
  ["08", "156,400", "Brod–brod"],
  ["09", "156,450", "Lučke operacije, marine"],
  ["10", "156,500", "Brod–brod, lučke operacije"],
  ["13", "156,650", "Sigurnost plovidbe, most–most"],
  ["17", "156,850", "Komunikacija na brodu (niska snaga)"],
  ["67", "156,375", "Brod–brod, lučke operacije"],
  ["72", "156,625", "Brod–brod"],
  ["77", "156,875", "Brod–brod"],
  ["AIS 1 / 2", "161,975 / 162,025", "Automatski identifikacijski sustav"],
];

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pomorstvo" subtitle="Pomorski pokretni VHF pojas (156–162 MHz) prema ITU Radio Regulations, Dodatak 18. Za rad je potrebna svjedodžba (GMDSS/SRC) i dozvola za brodsku postaju." />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Pogibelj"><p className="font-mono text-3xl text-warn">Kanal 16</p><p className="font-mono">156,800 MHz</p></Panel>
        <Panel title="MRCC Rijeka"><p className="font-mono text-3xl text-primary">195</p><p className="text-sm text-muted-foreground">Nacionalna središnjica za usklađivanje traganja i spašavanja na moru</p></Panel>
        <Panel title="Opći hitni broj"><p className="font-mono text-3xl text-primary">112</p></Panel>
      </div>
      <Panel title="Najvažniji VHF kanali">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-2">Kanal</th><th className="p-2">MHz</th><th className="p-2">Namjena</th></tr></thead>
          <tbody>{CH.map((c) => <tr key={c[0]} className="border-t border-border"><td className="p-2 font-mono text-primary">{c[0]}</td><td className="p-2 font-mono">{c[1]}</td><td className="p-2">{c[2]}</td></tr>)}</tbody>
        </table>
        <Source>ITU-R RR Dodatak 18</Source>
      </Panel>
      <Panel title="Vremenske prognoze za pomorce (DHMZ)">
        <p className="text-sm">Obalne radijske postaje Plovputa kontinuirano emitiraju prognozu na VHF kanalima: <b className="font-mono">69</b> (sjeverni Jadran), <b className="font-mono">67</b> (srednji Jadran), <b className="font-mono">73</b> (južni Jadran), uz najavu na kanalu 16. Raspored repetitorskih kanala po lokacijama provjerite na stranicama Plovputa.</p>
        <p className="mt-3 text-sm">NAVTEX: <b className="font-mono">518 kHz</b> (međunarodni, engleski) – za Jadran emitira postaja Split. Prognoza na webu: <a className="text-primary underline" href="https://meteo.hr/prognoze.php?section=prognoze_specp&param=jadran" target="_blank" rel="noreferrer">meteo.hr – Jadran</a>.</p>
        <Source>Plovput d.o.o., DHMZ. Provjerite aktualne kanale prije isplovljavanja.</Source>
      </Panel>
    </div>
  );
}

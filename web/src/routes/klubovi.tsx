import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/site";
import { seo } from "@/lib/seo";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/klubovi")({
  head: () => seo("Radioamaterski savezi i klubovi", "Hrvatski radioamaterski savez i nacionalni savezi susjednih zemalja, ispiti, natjecanja i korisne poveznice."),
  component: Page,
});

const ORGS = [
  ["Hrvatski radioamaterski savez (HRS)", "Hrvatska · 9A", "https://www.hamradio.hr"],
  ["Zveza radioamaterjev Slovenije (ZRS)", "Slovenija · S5", "https://www.hamradio.si"],
  ["Savez radio-amatera Srbije (SRS)", "Srbija · YU/YT", "https://www.yu1srs.org.rs"],
  ["Magyar Rádióamatőr Szövetség (MRASZ)", "Mađarska · HA/HG", "https://www.mrasz.hu"],
  ["Associazione Radioamatori Italiani (ARI)", "Italija · I", "https://www.ari.it"],
  ["IARU Regija 1 – popis svih članica", "Savezi BiH (E7), Crne Gore (4O) i ostalih", "https://www.iaru-r1.org/about-us/member-societies/"],
];
const LINKS = [
  ["HAKOM – dozvole i ispiti", "https://www.hakom.hr"],
  ["QRZ.com – pretraga pozivnih znakova", "https://www.qrz.com"],
  ["HamQTH – besplatna pretraga i log", "https://www.hamqth.com"],
  ["LoTW (ARRL Logbook of The World)", "https://lotw.arrl.org"],
  ["Club Log – DXCC i propagacija", "https://clublog.org"],
  ["WebSDR / KiwiSDR prijemnici", "http://www.websdr.org"],
  ["Reverse Beacon Network", "https://www.reversebeacon.net"],
  ["Meshtastic", "https://meshtastic.org"],
];
const CONTESTS = [
  ["IARU HF Championship", "drugi puni vikend u srpnju"],
  ["CQ WW DX SSB", "zadnji puni vikend u listopadu"],
  ["CQ WW DX CW", "zadnji puni vikend u studenom"],
  ["IARU R1 VHF/UHF natjecanja", "rujan (VHF), listopad (UHF)"],
];

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Klubovi i udruge" subtitle="Za ispit i dozvolu u Hrvatskoj obratite se HRS-u (tečajevi u klubovima) i HAKOM-u (ispit i izdavanje dozvole)." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ORGS.map(([n, c, u]) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="group rounded-xl border border-border bg-card/80 p-5 transition hover:border-primary hover:glow-primary">
            <p className="font-mono text-xs text-primary">{c}</p>
            <p className="mt-2 font-display text-lg font-semibold">{n}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary">{(u ?? "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0]} <ExternalLink className="size-3" /></p>
          </a>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Velika natjecanja">
          <ul className="space-y-2 text-sm">{CONTESTS.map(([n, d]) => <li key={n}><b>{n}</b> – <span className="text-muted-foreground">{d}</span></li>)}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Točne datume i pravila provjerite kod organizatora.</p>
        </Panel>
        <Panel title="Korisne poveznice">
          <ul className="space-y-2 text-sm">{LINKS.map(([n, u]) => <li key={u}><a className="text-primary hover:underline" href={u} target="_blank" rel="noreferrer">{n}</a></li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}

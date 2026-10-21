import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDxSpots, getLive, getMeshNodes, getSolar } from "@/lib/live.functions";
import { ErrorNote, LiveBadge, Loading, Panel, Source, UtcClock } from "@/components/site";
import { seo } from "@/lib/seo";
import { Activity, Antenna, GraduationCap, Map as MapIcon, Plane, Radio, Satellite, Ship, Waves, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Radioamaterski portal za Hrvatsku i regiju",
      "Propagacija uživo, DX klaster, repetitori, LoRa/Meshtastic, APRS, zrakoplovne i pomorske frekvencije za Hrvatsku i susjedne zemlje.",
    ),
  component: Index,
});

const condColor = (c: string) =>
  c === "Good" ? "text-signal" : c === "Fair" ? "text-primary" : "text-warn";
const condHr = (c: string) => ({ Good: "Dobro", Fair: "Srednje", Poor: "Loše" })[c] ?? c;

function Index() {
  const solar = useQuery({ queryKey: ["solar"], queryFn: () => getSolar(), refetchInterval: 10 * 60_000 });
  const dx = useQuery({ queryKey: ["dx"], queryFn: () => getDxSpots(), refetchInterval: 60_000 });
  const mesh = useQuery({ queryKey: ["mesh"], queryFn: () => getMeshNodes(), refetchInterval: 5 * 60_000 });
  const live = useQuery({ queryKey: ["live"], queryFn: () => getLive(), refetchInterval: 2 * 60_000 });

  const bands = solar.data?.bands ?? [];
  const bandNames = [...new Set(bands.map((b) => b.name))];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-panel p-8 scanlines md:p-12">
        <div className="absolute right-8 top-8 hidden h-24 items-end gap-1.5 opacity-60 md:flex">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="wave-bar w-1.5 rounded bg-primary" style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
        <LiveBadge label="NADZORNA PLOČA UŽIVO" />
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Sve za radioamatere <span className="text-primary text-glow">Hrvatske</span> i regije
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Propagacija, DX spotovi, repetitori, LoRa mreže, sateliti, zrakoplovne i pomorske frekvencije — na
          jednom mjestu, osvježavano u stvarnom vremenu.
        </p>
        <UtcClock className="mt-6 flex text-lg" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Sunčeva aktivnost" right={<LiveBadge />}>
          {solar.isLoading ? <Loading /> : solar.isError || !solar.data ? <ErrorNote /> : (
            <>
              <dl className="grid grid-cols-2 gap-3 font-mono">
                {[
                  ["SFI", solar.data.sfi],
                  ["Sunčeve pjege", solar.data.sunspots],
                  ["A-indeks", solar.data.aIndex],
                  ["K-indeks", solar.data.kIndex],
                  ["X-zrake", solar.data.xray],
                  ["Sunčev vjetar", `${solar.data.solarWind} km/s`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-panel p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="text-xl text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm">Geomagnetsko polje: <b>{solar.data.geomag}</b> · Šum: {solar.data.signalNoise}</p>
              <Source>HamQSL / N0NBH, ažurirano {solar.data.updated}</Source>
            </>
          )}
        </Panel>

        <Panel title="KV uvjeti po bandovima">
          {solar.isLoading ? <Loading /> : bands.length === 0 ? <ErrorNote /> : (
            <>
              <table className="w-full font-mono text-sm">
                <thead className="text-muted-foreground">
                  <tr><th className="py-1 text-left">Band</th><th>Dan</th><th>Noć</th></tr>
                </thead>
                <tbody>
                  {bandNames.map((n) => {
                    const d = bands.find((b) => b.name === n && b.time === "day")?.condition ?? "";
                    const ni = bands.find((b) => b.name === n && b.time === "night")?.condition ?? "";
                    return (
                      <tr key={n} className="border-t border-border">
                        <td className="py-2">{n}</td>
                        <td className={`text-center ${condColor(d)}`}>{condHr(d)}</td>
                        <td className={`text-center ${condColor(ni)}`}>{condHr(ni)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Planetarni Kp (zadnja 3 dana)</p>
                <div className="flex h-16 items-end gap-0.5">
                  {solar.data?.kpHistory.map((k) => (
                    <div key={k.time} title={`${k.time} Kp ${k.kp}`} className={`flex-1 rounded-t ${k.kp >= 5 ? "bg-warn" : k.kp >= 4 ? "bg-primary" : "bg-signal"}`} style={{ height: `${Math.max(6, (k.kp / 9) * 100)}%` }} />
                  ))}
                </div>
              </div>
              <Source>HamQSL, NOAA SWPC</Source>
            </>
          )}
        </Panel>

        <Panel title="Najnoviji DX spotovi" right={<Link to="/dx-klaster" className="text-sm text-primary">Svi →</Link>}>
          {dx.isLoading ? <Loading /> : dx.isError ? <ErrorNote /> : (
            <ul className="space-y-2 font-mono text-sm">
              {dx.data?.slice(0, 9).map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <span className="text-primary">{s.freq.toFixed(1)}</span>
                  <span className="font-semibold">{s.dx}</span>
                  <span className="truncate text-xs text-muted-foreground">{s.country}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Brzi pristup">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/karta", icon: MapIcon, t: "Karta uživo", d: live.data ? `${live.data.spots.length} PSKReporter spotova, ${live.data.nodes.length} Meshtastic čvorova` : "PSKReporter, Meshtastic, repetitori" },
            { to: "/ispit", icon: GraduationCap, t: "Ispit A i P", d: "Vježbovna pitanja po fazama" },
            { to: "/repetitori", icon: Antenna, t: "Repetitori", d: "VHF/UHF, DMR, C4FM u regiji" },
            { to: "/lora", icon: Waves, t: "LoRa / Meshtastic", d: mesh.data ? `${mesh.data.length} aktivnih čvorova (48 h)` : "EU868, EU433, karta čvorova" },
            { to: "/bandovi", icon: Radio, t: "HAM bandovi", d: "IARU R1 bandplan, razredi A i P" },
            { to: "/dx-klaster", icon: Activity, t: "DX klaster", d: "Spotovi u stvarnom vremenu" },
            { to: "/sateliti", icon: Satellite, t: "Sateliti", d: "ISS i preleti nad Hrvatskom" },
            { to: "/zrakoplovstvo", icon: Plane, t: "Zrakoplovstvo", d: "Frekvencije zračnih luka, METAR" },
            { to: "/pomorstvo", icon: Ship, t: "Pomorstvo", d: "VHF kanali, obalne postaje" },
            { to: "/alati", icon: Wrench, t: "Alati", d: "QTH lokator, kalkulatori" },
          ].map((x) => (
            <Link key={x.to} to={x.to} className="group rounded-lg border border-border bg-panel p-4 transition hover:border-primary hover:glow-primary">
              <x.icon className="size-6 text-primary" />
              <p className="mt-3 font-display font-semibold">{x.t}</p>
              <p className="text-sm text-muted-foreground">{x.d}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

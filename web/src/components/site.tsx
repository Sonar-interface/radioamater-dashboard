import { Link, ClientOnly } from "@tanstack/react-router";
import { Radio, Menu, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { MapMarker } from "./MapView";

export const NAV = [
  { to: "/", label: "Početna" },
  { to: "/karta", label: "Karta uživo" },
  { to: "/repetitori", label: "Repetitori" },
  { to: "/bandovi", label: "HAM bandovi" },
  { to: "/lora", label: "LoRa / Meshtastic" },
  { to: "/aprs", label: "APRS" },
  { to: "/dx-klaster", label: "DX klaster" },
  { to: "/sateliti", label: "Sateliti" },
  { to: "/zrakoplovstvo", label: "Zrakoplovstvo" },
  { to: "/pomorstvo", label: "Pomorstvo" },
  { to: "/frekvencije", label: "Ostale frekvencije" },
  { to: "/ispit", label: "Ispit A i P" },
  { to: "/klubovi", label: "Klubovi" },
  { to: "/alati", label: "Alati" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[1000] border-b border-border bg-panel/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground glow-primary">
            <Radio className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-wide">
            HAM <span className="text-primary">Hrvatska</span>
          </span>
        </Link>
        <UtcClock className="ml-auto hidden md:flex" />
        <button className="ml-auto rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Izbornik">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav className={`${open ? "block" : "hidden"} border-t border-border lg:block`}>
        <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 lg:flex-row lg:flex-wrap">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-accent !text-accent-foreground" }}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function UtcClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = (tz: string) =>
    now ? now.toLocaleTimeString("hr-HR", { timeZone: tz, hour12: false }) : "--:--:--";
  return (
    <div className={`items-center gap-4 font-mono text-sm ${className}`}>
      <span>
        <span className="text-muted-foreground">UTC </span>
        <span className="text-primary text-glow">{fmt("UTC")}</span>
      </span>
      <span>
        <span className="text-muted-foreground">HR </span>
        <span className="text-signal">{fmt("Europe/Zagreb")}</span>
      </span>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-panel/60">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
        <p>
          Podaci (osvježavanje svakih 10 min): PSKReporter, javni Meshtastic MQTT, HamQSL (N0NBH), NOAA SWPC,
          HamQTH DX klaster, AviationWeather.gov, OurAirports, HearHam, meshmap.net, CelesTrak. Granice: Natural Earth. Statični podaci: IARU Regija 1, HAKOM, ITU.
        </p>
        <p className="mt-2">
          Informativni portal. Prije emitiranja provjerite važeće propise HAKOM-a. Zrakoplovne i pomorske
          frekvencije nisu za navigaciju. 73!
        </p>
      </div>
    </footer>
  );
}

export function PageHeader({ title, subtitle, live }: { title: string; subtitle?: string; live?: boolean }) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {live && <LiveBadge />}
      </div>
      {subtitle && <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function LiveBadge({ label = "UŽIVO" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-3 py-1 font-mono text-xs text-signal">
      <span className="live-dot size-2 rounded-full bg-signal" />
      {label}
    </span>
  );
}

export function Panel({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-border bg-card/80 p-5 scanlines ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Source({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-muted-foreground">Izvor: {children}</p>;
}

export function Loading({ text = "Primam signal…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-muted-foreground">
      <div className="flex h-6 items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="wave-bar h-6 w-1 rounded bg-primary" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      {text}
    </div>
  );
}

export function ErrorNote({ text = "Izvor podataka trenutno nije dostupan. Pokušajte ponovno za nekoliko minuta." }) {
  return <p className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">{text}</p>;
}

const MapViewLazy = lazy(() => import("./MapView"));
export function Map(props: { markers: MapMarker[]; height?: number; center?: [number, number]; zoom?: number }) {
  const h = props.height ?? 480;
  const fallback = <div style={{ height: h }} className="rounded-xl bg-panel" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapViewLazy {...props} height={h} />
      </Suspense>
    </ClientOnly>
  );
}

export const mhz = (n: number, d = 3) => n.toFixed(d);

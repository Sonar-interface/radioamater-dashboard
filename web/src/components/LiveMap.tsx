import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MeshNode, MqttNode, PskSpot, Repeater } from "@/lib/live.functions";
import { bandOf, bearingDeg, compass, distanceKm } from "@/lib/geo";
import { esc } from "@/lib/utils";

export type LiveMapProps = {
  spots: PskSpot[];
  mqttNodes: MqttNode[];
  meshNodes: MeshNode[];
  repeaters: Repeater[];
  height?: number;
};

const C = { spot: "#e3b341", rx: "#58a6ff", mqtt: "#a371f7", mesh: "#d2a8ff", rpt: "#3fb950", hr: "#3fb6a8" };
const fmtTime = (t?: number | null) => (t ? new Date(t * 1000).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" }) : "—");
const row = (k: string, v: string) => `<tr><th style="text-align:left;padding-right:8px;opacity:.7;font-weight:500">${k}</th><td>${v}</td></tr>`;

function spotPopup(s: PskSpot) {
  const tx = s.txLatLon, rx = s.rxLatLon;
  let geo = "";
  if (tx && rx) {
    const a = { lat: tx[0], lon: tx[1] }, b = { lat: rx[0], lon: rx[1] };
    const brg = bearingDeg(a, b);
    geo = row("Udaljenost", `${Math.round(distanceKm(a, b)).toLocaleString("hr-HR")} km`) + row("Azimut", `${Math.round(brg)}° (${compass(brg)})`);
  }
  const mhz = s.freqHz ? (s.freqHz / 1e6).toFixed(4) + " MHz" : "—";
  return `<b>${esc(s.tx)}</b> → <b>${esc(s.rx)}</b><table style="margin-top:4px;font-size:12px">${
    row("Frekvencija", `${mhz} · ${esc(bandOf(s.freqHz))}`) + row("Mod", esc(s.mode)) + row("SNR", s.snr ? `${esc(s.snr)} dB` : "—") +
    row("Lokator TX", esc(s.txLoc)) + row("Lokator RX", esc(s.rxLoc)) + geo + row("Vrijeme", fmtTime(s.t))
  }</table><div style="opacity:.6;font-size:11px;margin-top:4px">Izvor: PSKReporter</div>`;
}

export default function LiveMap({ spots, mqttNodes, meshNodes, repeaters, height = 620 }: LiveMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groups = useRef<Partial<Record<"borders" | "spots" | "mqtt" | "mesh" | "rpt", L.LayerGroup>>>({});

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { center: [44.6, 16.5], zoom: 7, preferCanvas: true, worldCopyJump: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO · granice: Natural Earth",
      maxZoom: 18,
    }).addTo(map);
    map.createPane("granice").style.zIndex = "350";
    const g = {
      borders: L.layerGroup().addTo(map),
      spots: L.layerGroup().addTo(map),
      mqtt: L.layerGroup().addTo(map),
      mesh: L.layerGroup().addTo(map),
      rpt: L.layerGroup().addTo(map),
    };
    groups.current = g;
    L.control
      .layers(undefined, {
        "Granice HR i susjeda": g.borders,
        [`<span style="color:${C.spot}">●</span> PSKReporter predajnik · <span style="color:${C.rx}">●</span> prijemnik`]: g.spots,
        [`<span style="color:${C.mqtt}">●</span> Meshtastic (MQTT, uživo)`]: g.mqtt,
        [`<span style="color:${C.mesh}">●</span> Meshtastic (meshmap.net)`]: g.mesh,
        [`<span style="color:${C.rpt}">●</span> Repetitori`]: g.rpt,
      }, { collapsed: window.innerWidth < 700, position: "topright" })
      .addTo(map);
    fetch("./borders.json")
      .then((r) => r.json())
      .then((gj) => {
        // Granice su samo podloga (interactive: false) da ne preuzmu klikove s točaka iznad njih.
        L.geoJSON(gj, {
          pane: "granice",
          interactive: false,
          style: (f) => {
            const hr = f?.properties?.name === "Croatia";
            return { color: hr ? C.hr : "#8b98a5", weight: hr ? 2.5 : 1, fillColor: hr ? C.hr : "#8b98a5", fillOpacity: hr ? 0.12 : 0.03 };
          },
        }).addTo(g.borders);
      })
      .catch(() => undefined);
    mapRef.current = map;
    (window as unknown as { __hamMap?: L.Map }).__hamMap = map; // za automatske testove
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const g = groups.current.spots;
    if (!g) return;
    g.clearLayers();
    for (const s of spots) {
      if (!s.txLatLon) continue;
      if (s.rxLatLon) {
        L.polyline([s.txLatLon, s.rxLatLon], { color: C.spot, weight: 1, opacity: 0.35 }).bindPopup(() => spotPopup(s)).addTo(g);
        L.circleMarker(s.rxLatLon, { radius: 3, color: C.rx, fillColor: C.rx, fillOpacity: 0.8, weight: 1 }).bindPopup(() => spotPopup(s)).addTo(g);
      }
      L.circleMarker(s.txLatLon, { radius: 4, color: C.spot, fillColor: C.spot, fillOpacity: 0.9, weight: 1 }).bindPopup(() => spotPopup(s)).addTo(g);
    }
  }, [spots]);

  useEffect(() => {
    const g = groups.current.mqtt;
    if (!g) return;
    g.clearLayers();
    for (const n of mqttNodes) {
      if (typeof n.lat !== "number" || typeof n.lon !== "number") continue;
      const html = `<b>${esc(n.name ?? n.id)}</b><table style="margin-top:4px;font-size:12px">${
        row("ID", esc(n.id)) + row("Uređaj", esc(n.hw ?? "—")) + row("Visina", n.alt != null ? `${n.alt} m` : "—") +
        row("Baterija", n.battery != null ? `${n.battery} %` : "—") + row("Napon", n.voltage != null ? `${n.voltage} V` : "—") +
        row("Zadnje viđen", fmtTime(n.lastSeen))
      }</table><div style="opacity:.6;font-size:11px;margin-top:4px">Izvor: javni Meshtastic MQTT (EU_868)</div>`;
      L.circleMarker([n.lat, n.lon], { radius: 5, color: C.mqtt, fillColor: C.mqtt, fillOpacity: 0.85, weight: 1 }).bindPopup(html).addTo(g);
    }
  }, [mqttNodes]);

  useEffect(() => {
    const g = groups.current.mesh;
    if (!g) return;
    g.clearLayers();
    for (const n of meshNodes) {
      const html = `<b>${esc(n.longName || n.shortName || n.id)}</b><table style="margin-top:4px;font-size:12px">${
        row("ID", esc(n.id)) + row("Uređaj", esc(n.hw)) + row("Uloga", esc(n.role)) + row("Kanal", esc(n.channel)) + row("Zadnje viđen", fmtTime(n.lastSeen))
      }</table><div style="opacity:.6;font-size:11px;margin-top:4px">Izvor: meshmap.net</div>`;
      L.circleMarker([n.lat, n.lon], { radius: 4, color: C.mesh, fillColor: C.mesh, fillOpacity: 0.6, weight: 1 }).bindPopup(html).addTo(g);
    }
  }, [meshNodes]);

  useEffect(() => {
    const g = groups.current.rpt;
    if (!g) return;
    g.clearLayers();
    for (const r of repeaters) {
      const html = `<b>${esc(r.callsign)}</b><table style="margin-top:4px;font-size:12px">${
        row("Frekvencija", `${r.freq.toFixed(4)} MHz`) + row("Pomak", `${r.offset >= 0 ? "+" : ""}${r.offset.toFixed(3)} MHz`) +
        row("Mod", esc(r.mode)) + row("Ton", esc(r.tone || "—")) + row("Mreža", esc(r.network || "—")) + row("Mjesto", esc(r.city)) +
        row("Status", r.operational ? "radi" : "nepoznato / ne radi")
      }</table><div style="opacity:.6;font-size:11px;margin-top:4px">Izvor: HearHam</div>`;
      L.circleMarker([r.lat, r.lon], { radius: 4, color: C.rpt, fillColor: C.rpt, fillOpacity: 0.8, weight: 1 }).bindPopup(html).addTo(g);
    }
  }, [repeaters]);

  return <div ref={ref} style={{ height }} className="z-0 overflow-hidden rounded-xl border border-border" />;
}

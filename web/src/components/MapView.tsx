import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapMarker = { lat: number; lng: number; popup: string; color?: string };

export default function MapView({
  markers,
  height = 480,
  center = [44.6, 16.5],
  zoom = 7,
}: {
  markers: MapMarker[];
  height?: number;
  center?: [number, number];
  zoom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { center, zoom, scrollWheelZoom: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--primary").trim();
    for (const m of markers) {
      L.circleMarker([m.lat, m.lng], {
        radius: 6,
        color: m.color ?? primary,
        fillColor: m.color ?? primary,
        fillOpacity: 0.75,
        weight: 1,
      })
        .bindPopup(m.popup)
        .addTo(layer);
    }
  }, [markers]);

  return <div ref={ref} style={{ height }} className="z-0 overflow-hidden rounded-xl border border-border" />;
}

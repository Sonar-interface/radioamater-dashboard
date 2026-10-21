import { distanceKm } from "./locator";

export { distanceKm };

/** Početni azimut (stupnjevi) od a prema b. */
export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// 16 strana svijeta: S = sjever, I = istok, J = jug, Z = zapad
const COMPASS = ["S", "SSI", "SI", "ISI", "I", "IJI", "JI", "JJI", "J", "JJZ", "JZ", "ZJZ", "Z", "ZSZ", "SZ", "SSZ"];
export const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16] ?? "";

const HAM_BANDS: [number, number, string][] = [
  [1.8, 2.0, "160 m"], [3.5, 3.8, "80 m"], [5.35, 5.367, "60 m"], [7.0, 7.2, "40 m"], [10.1, 10.15, "30 m"],
  [14.0, 14.35, "20 m"], [18.068, 18.168, "17 m"], [21.0, 21.45, "15 m"], [24.89, 24.99, "12 m"],
  [28.0, 29.7, "10 m"], [50, 52, "6 m"], [70, 70.5, "4 m"], [144, 146, "2 m"], [430, 440, "70 cm"], [1240, 1300, "23 cm"],
];
export function bandOf(hz: number | null | undefined) {
  if (!hz) return "";
  const mhz = hz / 1e6;
  return HAM_BANDS.find(([a, b]) => mhz >= a && mhz <= b)?.[2] ?? "izvan HAM pojasa";
}

export const inRegion = (lat: number, lon: number) => lat > 41.8 && lat < 48.6 && lon > 12.0 && lon < 23.5;

/** Je li lokator u Hrvatskoj (približno, prema okviru) – koristi se samo za filtriranje prikaza. */
export const ZAGREB = { lat: 45.815, lon: 15.982 };

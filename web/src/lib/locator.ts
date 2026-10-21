// Maidenhead locator <-> lat/lon
export function toLocator(lat: number, lon: number): string {
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error("Neispravne koordinate");
  let x = Math.min(lon + 180, 359.9999999);
  let y = Math.min(lat + 90, 179.9999999);
  const A = "ABCDEFGHIJKLMNOPQR";
  const a = "abcdefghijklmnopqrstuvwx";
  const f1 = A.charAt(Math.floor(x / 20)) + A.charAt(Math.floor(y / 10));
  x %= 20; y %= 10;
  const f2 = String(Math.floor(x / 2)) + String(Math.floor(y));
  x %= 2; y %= 1;
  const f3 = a.charAt(Math.floor(x * 12)) + a.charAt(Math.floor(y * 24));
  return f1 + f2 + f3;
}

export function fromLocator(loc: string): { lat: number; lon: number } {
  const l = loc.trim().toUpperCase();
  if (!/^[A-R]{2}[0-9]{2}([A-X]{2})?$/.test(l)) throw new Error("Neispravan lokator");
  let lon = (l.charCodeAt(0) - 65) * 20 - 180 + Number(l[2]) * 2;
  let lat = (l.charCodeAt(1) - 65) * 10 - 90 + Number(l[3]);
  if (l.length === 6) {
    lon += (l.charCodeAt(4) - 65) / 12 + 1 / 24;
    lat += (l.charCodeAt(5) - 65) / 24 + 1 / 48;
  } else {
    lon += 1; lat += 0.5;
  }
  return { lat, lon };
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const wavelength = (mhz: number) => 299.792458 / mhz;

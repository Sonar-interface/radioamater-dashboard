/* Statična inačica: podatke svakih 10 min skuplja GitHub Action (izvori.py) u mapu data/.
   Stranica ih samo čita, pa nema servera ni API ključeva. */
export type Solar = {
  updated: string;
  sfi: string;
  aIndex: string;
  kIndex: string;
  xray: string;
  sunspots: string;
  solarWind: string;
  geomag: string;
  signalNoise: string;
  bands: { name: string; time: string; condition: string }[];
  vhf: { name: string; location: string; condition: string }[];
  kpHistory: { time: string; kp: number }[];
};

export type DxSpot = {
  spotter: string;
  freq: number;
  dx: string;
  comment: string;
  time: string;
  continent: string;
  band: string;
  country: string;
};

export type Metar = {
  icaoId: string;
  rawOb: string;
  reportTime: string;
  temp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  visib: string | number | null;
  altim: number | null;
  fltCat: string | null;
  name: string;
};

export type AirportFreq = { ident: string; type: string; description: string; mhz: number };

export type Repeater = {
  id: number;
  callsign: string;
  lat: number;
  lon: number;
  city: string;
  mode: string;
  freq: number; // MHz
  offset: number; // MHz
  tone: string;
  network: string;
  operational: boolean;
};

export type MeshNode = {
  raw?: Record<string, string | number | boolean>; // sva jednostavna polja iz meshmap.net zapisa
  id: string;
  longName: string;
  shortName: string;
  hw: string;
  role: string;
  lat: number;
  lon: number;
  lastSeen: number;
  channel: string;
};

export type PskSpot = {
  rx: string | null; rxLoc: string | null; tx: string | null; txLoc: string | null;
  freqHz: number | null; mode: string | null; snr: string | null;
  rxLatLon: [number, number] | null; txLatLon: [number, number] | null; t?: number | null;
};
export type MqttNode = {
  id: string; name?: string; hw?: string; lat?: number; lon?: number; alt?: number;
  battery?: number; voltage?: number; lastSeen: number;
  snr?: number; rssi?: number; hops?: number; heard?: number;
  chUtil?: number; airUtil?: number; uptime?: number;
  temp?: number; humidity?: number; pressure?: number;
};
export type LiveMeta = {
  updated: string; status: Record<string, string | number>; errors: string[];
  spots: PskSpot[]; nodes: MqttNode[];
};

async function getJson<T>(path: string): Promise<T> {
  // ?t= zaobilazi predmemoriju preglednika i GitHub Pages CDN-a (10 min).
  const res = await fetch(`./data/${path}?t=${Math.floor(Date.now() / 60_000)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const getSolar = () => getJson<Solar>("solar.json");
export const getDxSpots = () => getJson<DxSpot[]>("dx.json");
export const getMetars = async ({ data }: { data: { ids: string[] } }) => {
  const all = await getJson<{ metars: Metar[]; tafs: Record<string, string> }>("wx.json");
  const want = new Set(data.ids);
  return { metars: all.metars.filter((m) => want.has(m.icaoId)), tafs: all.tafs };
};
export const getAirportFreqs = () => getJson<AirportFreq[]>("afreq.json");
export const getRepeaters = () => getJson<Repeater[]>("repeaters.json");
export const getMeshNodes = () => getJson<MeshNode[]>("mesh.json");
export const getAmateurTle = async () => {
  const res = await fetch(`./data/tle.txt?t=${Math.floor(Date.now() / 3_600_000)}`);
  if (!res.ok) throw new Error(`tle: HTTP ${res.status}`);
  return res.text();
};
export const getLive = () => getJson<LiveMeta>("live.json");

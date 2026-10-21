#!/usr/bin/env python3
"""
izvori.py – skuplja žive podatke za portal HAM Hrvatska i sprema ih u mapu data/.

Pokreće ga GitHub Action svakih 10 min (vidi .github/workflows/izvori.yml).
Stranica (index.html) samo čita te datoteke, pa ne treba server ni API ključeve.

Datoteke i izvori:
  data/live.json       PSKReporter spotovi + Meshtastic čvorovi s javnog MQTT-a + status izvora
  data/solar.json      HamQSL (N0NBH) solarni podaci i KV uvjeti + NOAA SWPC planetarni Kp
  data/dx.json         HamQTH DX klaster (zadnjih 200 spotova)
  data/wx.json         aviationweather.gov METAR/TAF za zračne luke u regiji
  data/mesh.json       meshmap.net čvorovi u regiji (zadnjih 48 h)
  data/afreq.json      OurAirports frekvencije zračnih luka (svakih 6 h)
  data/repeaters.json  HearHam repetitori u regiji (svakih 6 h)
  data/tle.txt         CelesTrak TLE za amaterske satelite (svakih 6 h)

Pokretanje:  python izvori.py --minutes 9   (ono što radi GitHub Action)
             python izvori.py --once        (sve osim MQTT-a, jednom)
Paketi:      pip install meshtastic paho-mqtt cryptography

Privatnost: skripta ne šalje pozivni znak, lokaciju ni osobne podatke nikamo.
Sve veze su odlazne i samo čitaju javne podatke.
"""
import os, re, sys, csv, io, time, json, struct, base64, threading, datetime, urllib.request, urllib.parse
import xml.etree.ElementTree as ET

DATA = "data"
UA = "HAM-Hrvatska/1.0 (informativni portal; github.com/Sonar-interface/radioamater-dashboard)"
PSK_URL = "https://retrieve.pskreporter.info/query"
PSK_PARAMS = {"rronly": "1", "modify": "1", "flowStartSeconds": "-900", "nolocator": "0"}
PSK_EVERY = 300          # PSKReporter traži najviše jedan upit u 5 min
SLOW_EVERY = 6 * 3600    # rijetko mijenjani izvori
MQTT_HOST, MQTT_PORT = "mqtt.meshtastic.org", 1883
MQTT_USER, MQTT_PASS = "meshdev", "large4cats"  # javni podaci iz Meshtastic dokumentacije
MQTT_TOPIC = "msh/EU_868/2/e/#"
DEFAULT_PSK = base64.b64decode("1PG7OiApB1nwvP+rz05pAQ==")
NODE_TTL = 8 * 3600

# HR + SI, BA, RS, ME, HU, sjeverni Jadran (isto kao u Lovable izvorniku)
def in_region(lat, lon):
    return 41.8 < lat < 48.6 and 12.0 < lon < 23.5

AIRPORTS = ["LDZA", "LDSP", "LDDU", "LDZD", "LDPL", "LDRI", "LDOS", "LDSB", "LDLO", "LJLJ", "LJMB",
            "LQSA", "LQMO", "LQBK", "LQTZ", "LYBE", "LYNI", "LYPG", "LYTV", "LHBP", "LIPZ", "LIPQ"]

lock = threading.Lock()
state = {
    "spots": [], "nodes": {},
    "status": {"psk": "čeka", "mesh": "čeka", "mesh_decrypt_ok": 0, "mesh_decrypt_fail": 0},
    "errors": [],
}

def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def path(name):
    return os.path.join(DATA, name)

def write(name, obj):
    """Atomarni zapis: prvo u .tmp, zatim preimenovanje."""
    os.makedirs(DATA, exist_ok=True)
    tmp = path(name) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if isinstance(obj, str):
            f.write(obj)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path(name))

def age(name):
    try:
        return time.time() - os.path.getmtime(path(name))
    except OSError:
        return 1e12

def log_err(src, msg):
    with lock:
        state["errors"] = (state["errors"] + [f"{now_iso()} {src}: {msg}"])[-30:]
        state["status"][src] = "greška"
    print(f"[{src}] GREŠKA: {msg}")

def ok(src, msg):
    with lock:
        state["status"][src] = msg
    print(f"[{src}] {msg}")

def http_get(url, params=None, timeout=60):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def guarded(src):
    """Dekorator: greška jednog izvora ne ruši ostale."""
    def wrap(fn):
        def inner(*a, **k):
            try:
                return fn(*a, **k)
            except Exception as e:  # noqa: BLE001
                log_err(src, f"{type(e).__name__}: {e}")
        return inner
    return wrap

# ---------- Maidenhead lokator -> [lat, lon] ----------
def maidenhead(loc):
    if not loc or len(loc) < 4:
        return None
    loc = loc.upper()
    try:
        lon = (ord(loc[0]) - 65) * 20 - 180 + int(loc[2]) * 2
        lat = (ord(loc[1]) - 65) * 10 - 90 + int(loc[3])
        if len(loc) >= 6:
            lon += (ord(loc[4]) - 65) * (2 / 24) + (2 / 24) / 2
            lat += (ord(loc[5]) - 65) * (1 / 24) + (1 / 24) / 2
        else:
            lon += 1; lat += 0.5
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return None
        return [round(lat, 4), round(lon, 4)]
    except (ValueError, IndexError):
        return None

# ---------- PSKReporter ----------
@guarded("psk")
def psk_once():
    root = ET.fromstring(http_get(PSK_URL, PSK_PARAMS))
    spots = []
    for rr in root.iter("receptionReport"):
        a = rr.attrib
        spots.append({
            "rx": a.get("receiverCallsign"), "rxLoc": a.get("receiverLocator"),
            "tx": a.get("senderCallsign"), "txLoc": a.get("senderLocator"),
            "freqHz": int(a["frequency"]) if a.get("frequency", "").isdigit() else None,
            "mode": a.get("mode"), "snr": a.get("sNR"),
            "t": int(a["flowStartSeconds"]) if a.get("flowStartSeconds", "").isdigit() else None,
            "rxLatLon": maidenhead(a.get("receiverLocator")),
            "txLatLon": maidenhead(a.get("senderLocator")),
        })
    with lock:
        state["spots"] = spots
    ok("psk", f"OK, {len(spots)} spotova")

# ---------- HamQSL + NOAA Kp -> solar.json ----------
def _tag(xml, t):
    m = re.search(rf"<{t}>([\s\S]*?)</{t}>", xml)
    return (m.group(1) if m else "").strip()

@guarded("solar")
def solar_once():
    xml = http_get("https://www.hamqsl.com/solarxml.php").decode("utf-8", "replace")
    bands = [{"name": m[0], "time": m[1], "condition": m[2].strip()}
             for m in re.findall(r'<band name="([^"]+)" time="([^"]+)">([^<]+)</band>', xml)]
    vhf = [{"name": m[0], "location": m[1], "condition": m[2].strip()}
           for m in re.findall(r'<phenomenon name="([^"]+)" location="([^"]+)">([^<]+)</phenomenon>', xml)]
    kp_hist = []
    try:
        kp = json.loads(http_get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"))
        rows = []
        if kp and isinstance(kp[0], list):        # stari oblik: zaglavlje + redovi
            hdr = kp[0]; ti = hdr.index("time_tag"); ki = hdr.index("Kp")
            rows = [(r[ti], r[ki]) for r in kp[1:]]
        else:                                      # novi oblik: lista objekata
            rows = [(r.get("time_tag"), r.get("Kp")) for r in kp]
        kp_hist = [{"time": t, "kp": float(k)} for t, k in rows[-24:] if k is not None]
    except Exception as e:  # noqa: BLE001
        log_err("kp", str(e))
    if not bands:
        raise ValueError("HamQSL nije vratio pojaseve")
    write("solar.json", {
        "updated": _tag(xml, "updated"), "sfi": _tag(xml, "solarflux"), "aIndex": _tag(xml, "aindex"),
        "kIndex": _tag(xml, "kindex"), "xray": _tag(xml, "xray"), "sunspots": _tag(xml, "sunspots"),
        "solarWind": _tag(xml, "solarwind"), "geomag": _tag(xml, "geomagfield"),
        "signalNoise": _tag(xml, "signalnoise"), "bands": bands, "vhf": vhf, "kpHistory": kp_hist,
    })
    ok("solar", f"OK, SFI {_tag(xml, 'solarflux')}, {len(bands)} pojaseva, Kp {len(kp_hist)}")

# ---------- HamQTH DX klaster -> dx.json ----------
@guarded("dx")
def dx_once():
    text = http_get("https://www.hamqth.com/dxc_csv.php", {"limit": "200"}).decode("utf-8", "replace")
    out = []
    for line in text.splitlines():
        p = line.split("^")
        if len(p) < 10 or not p[1]:
            continue
        try:
            freq = float(p[1])
        except ValueError:
            continue
        out.append({"spotter": p[0], "freq": freq, "dx": p[2], "comment": p[3], "time": p[4],
                    "continent": p[7], "band": p[8], "country": p[9]})
    if not out:
        raise ValueError("prazan odgovor")
    write("dx.json", out)
    ok("dx", f"OK, {len(out)} spotova")

# ---------- METAR / TAF -> wx.json ----------
@guarded("wx")
def wx_once():
    ids = ",".join(AIRPORTS)
    metars_raw = json.loads(http_get("https://aviationweather.gov/api/data/metar", {"ids": ids, "format": "json"}) or b"[]")
    try:
        tafs_raw = json.loads(http_get("https://aviationweather.gov/api/data/taf", {"ids": ids, "format": "json"}) or b"[]")
    except Exception as e:  # noqa: BLE001
        tafs_raw = []; log_err("taf", str(e))
    metars = [{
        "icaoId": str(x.get("icaoId")), "rawOb": str(x.get("rawOb") or ""), "reportTime": str(x.get("reportTime") or ""),
        "temp": x.get("temp"), "wdir": x.get("wdir"), "wspd": x.get("wspd"), "visib": x.get("visib"),
        "altim": x.get("altim"), "fltCat": x.get("fltCat"), "name": str(x.get("name") or ""),
    } for x in metars_raw]
    tafs = {str(x.get("icaoId")): str(x.get("rawTAF") or "") for x in tafs_raw}
    write("wx.json", {"metars": metars, "tafs": tafs})
    ok("wx", f"OK, {len(metars)} METAR, {len(tafs)} TAF")

# ---------- meshmap.net -> mesh.json ----------
@guarded("meshmap")
def meshmap_once():
    allnodes = json.loads(http_get("https://meshmap.net/nodes.json", timeout=90))
    now = time.time(); out = []
    for nid, n in allnodes.items():
        if not isinstance(n.get("latitude"), (int, float)) or not isinstance(n.get("longitude"), (int, float)):
            continue
        lat, lon = n["latitude"] / 1e7, n["longitude"] / 1e7
        if not in_region(lat, lon):
            continue
        last, topic = 0, ""
        for k, v in (n.get("seenBy") or {}).items():
            if isinstance(v, (int, float)) and v > last:
                last, topic = v, k
        if now - last > 48 * 3600:
            continue
        parts = topic.split("/")
        raw = {k: (v[:160] if isinstance(v, str) else v) for k, v in n.items()
               if isinstance(v, (int, float, str, bool)) and k not in ("latitude", "longitude")}
        out.append({"id": nid, "longName": str(n.get("longName") or "").strip(),
                    "shortName": str(n.get("shortName") or "").strip(), "hw": str(n.get("hwModel") or ""),
                    "role": str(n.get("role") or ""), "lat": lat, "lon": lon, "lastSeen": last,
                    "channel": parts[-2] if len(parts) > 2 else "", "raw": raw})
    out.sort(key=lambda x: -x["lastSeen"])
    write("mesh.json", out)
    ok("meshmap", f"OK, {len(out)} čvorova u regiji")

# ---------- rijetki izvori ----------
@guarded("afreq")
def afreq_once():
    text = http_get("https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv", timeout=120).decode("utf-8", "replace")
    out = []
    for row in csv.reader(io.StringIO(text)):
        if len(row) < 6 or not re.fullmatch(r"L[DJQYHI][A-Z]{2}", row[2]):
            continue
        try:
            out.append({"ident": row[2], "type": row[3], "description": row[4], "mhz": float(row[5])})
        except ValueError:
            pass
    write("afreq.json", out)
    ok("afreq", f"OK, {len(out)} frekvencija")

@guarded("repeaters")
def repeaters_once():
    allr = json.loads(http_get("https://hearham.com/api/repeaters/v1", timeout=120))
    out = []
    for x in allr:
        lat, lon = x.get("latitude"), x.get("longitude")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not in_region(lat, lon):
            continue
        desc = str(x.get("description") or "")
        m = re.search(r"Network:\s*([^\n]+)", desc)
        out.append({"id": int(x.get("id") or 0), "callsign": str(x.get("callsign") or ""), "lat": lat, "lon": lon,
                    "city": str(x.get("city") or ""), "mode": str(x.get("mode") or ""),
                    "freq": float(x.get("frequency") or 0) / 1e6, "offset": float(x.get("offset") or 0) / 1e6,
                    "tone": str(x.get("encode") or ""), "network": m.group(1).strip() if m else str(x.get("group") or ""),
                    "operational": str(x.get("operational")) == "1"})
    out.sort(key=lambda r: r["callsign"])
    write("repeaters.json", out)
    ok("repeaters", f"OK, {len(out)} repetitora u regiji")

@guarded("tle")
def tle_once():
    text = http_get("https://celestrak.org/NORAD/elements/gp.php", {"GROUP": "amateur", "FORMAT": "tle"}).decode("ascii", "replace")
    if "1 " not in text:
        raise ValueError("neočekivan odgovor")
    write("tle.txt", text)
    ok("tle", f"OK, {text.count(chr(10)) // 3} satelita")

def slow_sources(force=False):
    for name, fn in (("afreq.json", afreq_once), ("repeaters.json", repeaters_once), ("tle.txt", tle_once)):
        if force or age(name) > SLOW_EVERY:
            fn()

# ---------- Meshtastic MQTT ----------
def decrypt(packet_id, from_node, cipher):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    nonce = struct.pack("<Q", packet_id) + struct.pack("<Q", from_node)
    dec = Cipher(algorithms.AES(DEFAULT_PSK), modes.CTR(nonce)).decryptor()
    return dec.update(cipher) + dec.finalize()

def handle_mesh(payload):
    from meshtastic.protobuf import mesh_pb2, mqtt_pb2, portnums_pb2, telemetry_pb2
    from google.protobuf.message import DecodeError
    try:
        env = mqtt_pb2.ServiceEnvelope(); env.ParseFromString(payload)
        pkt = env.packet
        if not pkt.HasField("encrypted"):
            return
        data = mesh_pb2.Data(); data.ParseFromString(decrypt(pkt.id, getattr(pkt, "from"), pkt.encrypted))
        port = data.portnum
        node = f"!{getattr(pkt, 'from'):08x}"
        now = time.time()
        with lock:
            state["status"]["mesh_decrypt_ok"] += 1
            rec = state["nodes"].setdefault(node, {"lastSeen": now})
            rec["lastSeen"] = now
        with lock:
            if pkt.rx_snr or pkt.rx_rssi:
                rec["snr"] = round(pkt.rx_snr, 2); rec["rssi"] = pkt.rx_rssi
            if pkt.hop_start:
                rec["hops"] = max(0, pkt.hop_start - pkt.hop_limit)
            rec["heard"] = now
        if port == portnums_pb2.POSITION_APP:
            pos = mesh_pb2.Position(); pos.ParseFromString(data.payload)
            if pos.latitude_i or pos.longitude_i:
                with lock:
                    rec["lat"] = pos.latitude_i * 1e-7; rec["lon"] = pos.longitude_i * 1e-7; rec["alt"] = pos.altitude
        elif port == portnums_pb2.NODEINFO_APP:
            u = mesh_pb2.User(); u.ParseFromString(data.payload)
            with lock:
                rec["name"] = u.long_name or u.short_name
                rec["hw"] = mesh_pb2.HardwareModel.Name(u.hw_model)
        elif port == portnums_pb2.TELEMETRY_APP:
            t = telemetry_pb2.Telemetry(); t.ParseFromString(data.payload)
            dm, em = t.device_metrics, t.environment_metrics
            with lock:
                if t.HasField("device_metrics"):
                    rec["battery"] = dm.battery_level; rec["voltage"] = round(dm.voltage, 2)
                    rec["chUtil"] = round(dm.channel_utilization, 1); rec["airUtil"] = round(dm.air_util_tx, 1)
                    rec["uptime"] = dm.uptime_seconds
                if t.HasField("environment_metrics"):
                    rec["temp"] = round(em.temperature, 1); rec["humidity"] = round(em.relative_humidity, 1)
                    rec["pressure"] = round(em.barometric_pressure, 1)
    except (DecodeError, ValueError, UnicodeDecodeError):
        with lock:
            state["status"]["mesh_decrypt_fail"] += 1

def prune_nodes():
    cutoff = time.time() - NODE_TTL
    with lock:
        for k in [k for k, v in state["nodes"].items() if v.get("lastSeen", 0) < cutoff]:
            del state["nodes"][k]

def mesh_loop():
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        log_err("mesh", "nedostaje paho-mqtt"); return
    def on_connect(c, u, f, rc, *a):
        c.subscribe(MQTT_TOPIC); ok("mesh", "spojeno")
    def on_message(c, u, msg):
        handle_mesh(msg.payload)
    try:
        c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ham-hr-" + str(int(time.time())))
    except AttributeError:
        c = mqtt.Client(client_id="ham-hr-" + str(int(time.time())))
    c.username_pw_set(MQTT_USER, MQTT_PASS)
    c.on_connect = on_connect; c.on_message = on_message
    while True:
        try:
            c.connect(MQTT_HOST, MQTT_PORT, keepalive=60); c.loop_forever()
        except Exception as e:  # noqa: BLE001
            log_err("mesh", str(e)); time.sleep(30)

# ---------- live.json ----------
def save_live():
    with lock:
        out = {"updated": now_iso(), "status": dict(state["status"]), "errors": list(state["errors"]),
               "spots": state["spots"], "nodes": [dict(v, id=k) for k, v in state["nodes"].items()]}
    write("live.json", out)

def load_previous():
    """Čvorovi i spotovi iz prethodnog pokretanja (GitHub Action svaki put kreće ispočetka)."""
    try:
        prev = json.load(open(path("live.json"), encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return
    with lock:
        state["spots"] = prev.get("spots", [])
        for n in prev.get("nodes", []):
            nid = n.pop("id", None)
            if nid:
                state["nodes"][nid] = n
    prune_nodes()

def main():
    once = "--once" in sys.argv
    load_previous()
    psk_once(); solar_once(); dx_once(); wx_once(); meshmap_once(); slow_sources()
    save_live()
    if once:
        return
    threading.Thread(target=mesh_loop, daemon=True).start()
    last_psk = time.time()
    deadline = time.time() + 60 * int(sys.argv[sys.argv.index("--minutes") + 1]) if "--minutes" in sys.argv else None
    while True:
        time.sleep(60)
        if time.time() - last_psk >= PSK_EVERY:
            psk_once(); last_psk = time.time()
        prune_nodes(); save_live()
        if deadline and time.time() > deadline:
            return

if __name__ == "__main__":
    main()

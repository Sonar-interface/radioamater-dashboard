#!/usr/bin/env python3
"""
izvori.py – skuplja žive podatke za radioamaterski dashboard i sprema data.json.

Izvori:
  1) PSKReporter (spotovi digitalnih modova)      – osvježavanje svakih 5 min
  2) hamqsl.com solarni podaci (SFI, K-index ...) – osvježavanje svakih 30 min
  3) Meshtastic javni MQTT (čvorovi, pozicije, telemetrija, EU_868) – stalno, zapis svakih 60 s

Pokretanje:  python izvori.py            (radi dok ga ne zaustaviš s Ctrl+C)
             python izvori.py --once     (samo PSKReporter + solar, bez MQTT-a)
Pakete:      pip install meshtastic paho-mqtt cryptography

Privatnost: skripta ne šalje pozivni znak, lokaciju ni osobne podatke nigdje.
Sve veze su odlazne i čitaju javne podatke. Ne objavljuje ništa.
"""
import sys, time, json, struct, base64, threading, datetime, urllib.request, urllib.parse
import xml.etree.ElementTree as ET

OUT = "data.json"
UA = "radioamater-dashboard/1.0 (private; polls politely)"
PSK_URL = "https://retrieve.pskreporter.info/query"
PSK_PARAMS = {"rronly": "1", "modify": "1", "flowStartSeconds": "-900", "nolocator": "0"}
PSK_EVERY = 300          # 5 min (PSKReporter traži najviše jedan zahtjev u 5 min)
SOLAR_URL = "https://www.hamqsl.com/solarxml.php"   # NEPROVJERENO, vidi napomenu niže
SOLAR_EVERY = 1800       # 30 min (sajt navodi osvježavanje svakih 3 h, uzimamo 30 min)
MQTT_HOST, MQTT_PORT = "mqtt.meshtastic.org", 1883
MQTT_USER, MQTT_PASS = "meshdev", "large4cats"  # javni podaci iz Meshtastic dokumentacije
MQTT_TOPIC = "msh/EU_868/2/e/#"
DEFAULT_PSK = base64.b64decode("1PG7OiApB1nwvP+rz05pAQ==")  # zadani ključ (potvrđen u meshtastic biblioteci)
NODE_TTL = 8 * 3600      # čvor se miče nakon 8 h bez nove pozicije (kao meshmap.net)

lock = threading.Lock()
state = {
    "updated": {},
    "spots": [], "solar": {}, "nodes": {},
    "status": {"psk": "čeka", "solar": "čeka", "mesh": "čeka", "mesh_decrypt_ok": 0, "mesh_decrypt_fail": 0},
    "errors": [],
}

def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def save():
    with lock:
        out = {k: state[k] for k in ("spots", "solar", "status", "errors")}
        out["updated"] = now_iso()
        out["nodes"] = [dict(v, id=k) for k, v in state["nodes"].items()]
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False)

def log_err(src, msg):
    with lock:
        state["errors"] = (state["errors"] + [f"{now_iso()} {src}: {msg}"])[-20:]
    print(f"[{src}] GREŠKA: {msg}")

def http_get(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

# ---------- Maidenhead lokator -> (lat, lon) ----------
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
        return [round(lat, 4), round(lon, 4)]
    except (ValueError, IndexError):
        return None

# ---------- 1) PSKReporter ----------
def psk_once():
    try:
        root = ET.fromstring(http_get(PSK_URL, PSK_PARAMS))
        spots = []
        for rr in root.iter("receptionReport"):
            a = rr.attrib
            spots.append({
                "rx": a.get("receiverCallsign"), "rxLoc": a.get("receiverLocator"),
                "tx": a.get("senderCallsign"), "txLoc": a.get("senderLocator"),
                "freqHz": int(a["frequency"]) if a.get("frequency", "").isdigit() else None,
                "mode": a.get("mode"), "snr": a.get("sNR"),
                "rxLatLon": maidenhead(a.get("receiverLocator")),
                "txLatLon": maidenhead(a.get("senderLocator")),
            })
        with lock:
            state["spots"] = spots
            state["status"]["psk"] = f"OK, {len(spots)} spotova"
        print(f"[PSK] {len(spots)} spotova")
    except Exception as e:
        log_err("PSK", str(e))
        with lock:
            state["status"]["psk"] = "greška"

# ---------- 2) Solar ----------
def solar_once():
    try:
        root = ET.fromstring(http_get(SOLAR_URL))
        sd = root.find("solardata")
        if sd is None:
            raise ValueError("nema elementa <solardata> (format se razlikuje)")
        data = {c.tag: (c.text or "").strip() for c in sd if len(c) == 0}
        bands = []
        cc = sd.find("calculatedconditions")
        if cc is not None:
            for b in cc.iter("band"):
                bands.append({"band": b.get("name"), "time": b.get("time"), "cond": (b.text or "").strip()})
        data["bands"] = bands
        with lock:
            state["solar"] = data
            state["status"]["solar"] = f"OK ({len(bands)} pojaseva)"
        print(f"[SOLAR] sfi={data.get('solarflux')} k={data.get('kindex')}")
    except Exception as e:
        log_err("SOLAR", str(e))
        with lock:
            state["status"]["solar"] = "greška"

# ---------- 3) Meshtastic MQTT ----------
def decrypt(packet_id, from_node, cipher):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    nonce = struct.pack("<Q", packet_id) + struct.pack("<Q", from_node)   # raspored nonce-a: NEPROVJERENO
    dec = Cipher(algorithms.AES(DEFAULT_PSK), modes.CTR(nonce)).decryptor()
    return dec.update(cipher) + dec.finalize()

def handle_mesh(payload):
    from meshtastic.protobuf import mesh_pb2, mqtt_pb2, portnums_pb2, telemetry_pb2, mesh_pb2 as mp
    from google.protobuf.message import DecodeError
    try:
        env = mqtt_pb2.ServiceEnvelope()
        env.ParseFromString(payload)
        pkt = env.packet
        if not pkt.HasField("encrypted"):
            return
        plain = decrypt(pkt.id, getattr(pkt, "from"), pkt.encrypted)
        data = mesh_pb2.Data()
        data.ParseFromString(plain)
        port = data.portnum
        node = f"!{getattr(pkt, 'from'):08x}"
        with lock:
            state["status"]["mesh_decrypt_ok"] += 1
        now = time.time()
        with lock:
            rec = state["nodes"].setdefault(node, {"lastSeen": now})
            rec["lastSeen"] = now
        if port == portnums_pb2.POSITION_APP:
            pos = mesh_pb2.Position(); pos.ParseFromString(data.payload)
            if pos.latitude_i or pos.longitude_i:
                with lock:
                    rec["lat"] = pos.latitude_i * 1e-7
                    rec["lon"] = pos.longitude_i * 1e-7
                    rec["alt"] = pos.altitude
        elif port == portnums_pb2.NODEINFO_APP:
            u = mesh_pb2.User(); u.ParseFromString(data.payload)
            with lock:
                rec["name"] = u.long_name or u.short_name
                rec["hw"] = mesh_pb2.HardwareModel.Name(u.hw_model)
        elif port == portnums_pb2.TELEMETRY_APP:
            t = telemetry_pb2.Telemetry(); t.ParseFromString(data.payload)
            if t.HasField("device_metrics"):
                with lock:
                    rec["battery"] = t.device_metrics.battery_level
                    rec["voltage"] = t.device_metrics.voltage
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
        log_err("MESH", "nedostaje paho-mqtt (pip install paho-mqtt meshtastic cryptography)")
        return
    def on_connect(c, u, f, rc, *a):
        print(f"[MESH] spojeno (rc={rc}), slušam {MQTT_TOPIC}")
        c.subscribe(MQTT_TOPIC)
        with lock: state["status"]["mesh"] = "spojeno"
    def on_message(c, u, msg):
        handle_mesh(msg.payload)
    c = mqtt.Client(client_id="radioamater-dash-" + str(int(time.time())))
    c.username_pw_set(MQTT_USER, MQTT_PASS)
    c.on_connect = on_connect; c.on_message = on_message
    while True:
        try:
            c.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            c.loop_forever()
        except Exception as e:
            log_err("MESH", str(e))
            with lock: state["status"]["mesh"] = "greška, ponovni pokušaj"
            time.sleep(30)

def load_previous():
    """Učitaj čvorove iz prethodnog data.json (važno za GitHub Actions, gdje se proces resetira)."""
    try:
        prev = json.load(open(OUT, encoding="utf-8"))
        with lock:
            for n in prev.get("nodes", []):
                nid = n.pop("id", None)
                if nid: state["nodes"][nid] = n
        prune_nodes()
    except (FileNotFoundError, json.JSONDecodeError):
        pass

def main():
    once = "--once" in sys.argv
    load_previous()
    psk_once(); solar_once(); save()
    if once:
        return
    threading.Thread(target=mesh_loop, daemon=True).start()
    last_psk = last_solar = time.time()
    deadline = None
    if "--minutes" in sys.argv:
        deadline = time.time() + 60 * int(sys.argv[sys.argv.index("--minutes") + 1])
    while True:
        if deadline and time.time() > deadline:
            save(); return
        time.sleep(60)
        now = time.time()
        if now - last_psk >= PSK_EVERY:
            psk_once(); last_psk = now
        if now - last_solar >= SOLAR_EVERY:
            solar_once(); last_solar = now
        prune_nodes()
        save()

if __name__ == "__main__":
    main()

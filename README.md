# HAM Hrvatska – radioamaterski portal

Stranica: https://sonar-interface.github.io/radioamater-dashboard/

Izgled i stranice preuzeti su iz Lovable projekta "Jadran Radio Kompas" i prilagođeni za GitHub Pages
(statični build, hash routing). Dodano: Karta uživo (PSKReporter, Meshtastic MQTT, meshmap.net, repetitori,
granice HR i susjeda) i Ispit A i P.

## Kako radi
- `izvori.py` skuplja javne podatke i sprema ih u `data/`. Pokreće ga GitHub Action
  (`.github/workflows/izvori.yml`) svakih ~10 min. Stranica samo čita te datoteke.
- Izvori: PSKReporter, javni Meshtastic MQTT (EU_868, zadani kanal), HamQSL (N0NBH), NOAA SWPC,
  HamQTH DX klaster, aviationweather.gov, OurAirports, HearHam, meshmap.net, CelesTrak.
- Stanje svakog izvora vidi se na stranici Karta uživo (Stanje izvora). Ako izvor ne radi,
  stranica prikazuje poruku, a ne izmišljene podatke.

## Izmjene izgleda
Izvorni kod je u `web/`. Nakon izmjene pokrenuti `web/objavi.sh` i commitati korijen
(`index.html`, `assets/`).

## Privatnost
Stranica nema kolačića ni analitike. Lovable prijava grešaka je uklonjena. Skripta ne šalje
nikakve osobne podatke; samo čita javne izvore.

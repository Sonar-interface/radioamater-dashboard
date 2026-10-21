# Radioamaterski pregled – Hrvatska

Dashboard: `radioamater_dashboard.html` (otvori preko GitHub Pages).

`data.json` osvježava GitHub Actions (`.github/workflows/izvori.yml`) svakih ~10 min:
- PSKReporter spotovi digitalnih modova
- solarni uvjeti (hamqsl.com, NEPROVJERENO)
- Meshtastic čvorovi, javni MQTT (dekodiranje NEPROVJERENO)

Ako `status` u `data.json` piše "greška", izvor nije dostupan. Dashboard tada ne prikazuje lažne podatke.
Javni podaci: sadrže samo identifikatore javnih čvorova i spotove; bez pozivnog znaka i lokacije korisnika.

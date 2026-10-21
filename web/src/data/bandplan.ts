// IARU Region 1 band plan (HF Sun City / VHF/UHF Vienna recommendations), simplified.
export type Segment = { from: number; to: number; use: string };
export type Band = {
  band: string;
  range: string; // display
  segments: Segment[]; // kHz for HF, MHz for VHF+
  unit: "kHz" | "MHz";
  key: string; // key frequencies
  classA: boolean;
  classP: boolean;
  note?: string;
};

export const BANDS: Band[] = [
  { band: "160 m", range: "1810 – 2000 kHz", unit: "kHz", classA: true, classP: true, key: "FT8 1840", segments: [
    { from: 1810, to: 1838, use: "CW" }, { from: 1838, to: 1840, use: "Uskopojasni modovi" }, { from: 1840, to: 1843, use: "Digitalni / svi modovi" }, { from: 1843, to: 2000, use: "Svi modovi (SSB)" }] },
  { band: "80 m", range: "3500 – 3800 kHz", unit: "kHz", classA: true, classP: true, key: "FT8 3573 · QRP CW 3560 · Hitne 3760", segments: [
    { from: 3500, to: 3570, use: "CW" }, { from: 3570, to: 3600, use: "Uskopojasni digitalni" }, { from: 3600, to: 3800, use: "Svi modovi (SSB)" }] },
  { band: "60 m", range: "5351,5 – 5366,5 kHz", unit: "kHz", classA: true, classP: false, key: "FT8 5357 · maks. 15 W EIRP", note: "WRC-15 dodjela; status u HR provjerite u HAKOM tablici namjene.", segments: [
    { from: 5351.5, to: 5354, use: "CW, uskopojasni" }, { from: 5354, to: 5366, use: "Svi modovi (USB)" }, { from: 5366, to: 5366.5, use: "Slabi signali" }] },
  { band: "40 m", range: "7000 – 7200 kHz", unit: "kHz", classA: true, classP: true, key: "FT8 7074 · QRP CW 7030 · Hitne 7110", segments: [
    { from: 7000, to: 7040, use: "CW" }, { from: 7040, to: 7050, use: "Uskopojasni digitalni" }, { from: 7050, to: 7200, use: "Svi modovi (SSB)" }] },
  { band: "30 m", range: "10100 – 10150 kHz", unit: "kHz", classA: true, classP: false, key: "FT8 10136 · bez SSB-a", segments: [
    { from: 10100, to: 10130, use: "CW" }, { from: 10130, to: 10150, use: "Uskopojasni digitalni" }] },
  { band: "20 m", range: "14000 – 14350 kHz", unit: "kHz", classA: true, classP: false, key: "FT8 14074 · SSTV 14230 · Hitne 14300 · NCDXF svjetionici 14100", segments: [
    { from: 14000, to: 14070, use: "CW" }, { from: 14070, to: 14099, use: "Uskopojasni digitalni" }, { from: 14099, to: 14101, use: "IBP svjetionici" }, { from: 14101, to: 14350, use: "Svi modovi (SSB)" }] },
  { band: "17 m", range: "18068 – 18168 kHz", unit: "kHz", classA: true, classP: false, key: "FT8 18100 · Hitne 18160", segments: [
    { from: 18068, to: 18095, use: "CW" }, { from: 18095, to: 18109, use: "Uskopojasni digitalni" }, { from: 18109, to: 18111, use: "IBP svjetionici" }, { from: 18111, to: 18168, use: "Svi modovi (SSB)" }] },
  { band: "15 m", range: "21000 – 21450 kHz", unit: "kHz", classA: true, classP: true, key: "FT8 21074 · Hitne 21360", segments: [
    { from: 21000, to: 21070, use: "CW" }, { from: 21070, to: 21149, use: "Uskopojasni digitalni" }, { from: 21149, to: 21151, use: "IBP svjetionici" }, { from: 21151, to: 21450, use: "Svi modovi (SSB)" }] },
  { band: "12 m", range: "24890 – 24990 kHz", unit: "kHz", classA: true, classP: false, key: "FT8 24915", segments: [
    { from: 24890, to: 24915, use: "CW" }, { from: 24915, to: 24929, use: "Uskopojasni digitalni" }, { from: 24929, to: 24931, use: "IBP svjetionici" }, { from: 24931, to: 24990, use: "Svi modovi (SSB)" }] },
  { band: "10 m", range: "28000 – 29700 kHz", unit: "kHz", classA: true, classP: true, key: "FT8 28074 · SSB poziv 28500 · FM poziv 29600", segments: [
    { from: 28000, to: 28070, use: "CW" }, { from: 28070, to: 28190, use: "Uskopojasni digitalni" }, { from: 28190, to: 28225, use: "Svjetionici" }, { from: 28225, to: 29200, use: "Svi modovi (SSB)" }, { from: 29200, to: 29300, use: "Svi modovi / digitalni" }, { from: 29300, to: 29510, use: "Sateliti" }, { from: 29510, to: 29700, use: "FM simpleks i repetitori" }] },
  { band: "6 m", range: "50 – 52 MHz", unit: "MHz", classA: true, classP: false, key: "FT8 50,313 · SSB poziv 50,150", segments: [
    { from: 50.0, to: 50.1, use: "CW, svjetionici" }, { from: 50.1, to: 50.5, use: "SSB, CW, digitalni" }, { from: 50.5, to: 52, use: "Svi modovi, FM" }] },
  { band: "2 m", range: "144 – 146 MHz", unit: "MHz", classA: true, classP: true, key: "FM poziv 145,500 · APRS 144,800 · SSB poziv 144,300 · FT8 144,174", segments: [
    { from: 144.0, to: 144.15, use: "CW, EME" }, { from: 144.15, to: 144.4, use: "SSB, CW, MGM" }, { from: 144.4, to: 144.49, use: "Svjetionici" }, { from: 144.5, to: 144.794, use: "Svi modovi / digitalni" }, { from: 144.794, to: 144.99, use: "Digitalni (APRS 144,800)" }, { from: 144.99, to: 145.194, use: "Ulazi repetitora (−600 kHz)" }, { from: 145.194, to: 145.594, use: "FM simpleks" }, { from: 145.594, to: 145.794, use: "Izlazi repetitora" }, { from: 145.8, to: 146.0, use: "Sateliti" }] },
  { band: "70 cm", range: "430 – 440 MHz", unit: "MHz", classA: true, classP: true, key: "FM poziv 433,500 · LoRa APRS 433,775 · SSB poziv 432,200", segments: [
    { from: 430.0, to: 432.0, use: "Svi modovi, ulazi repetitora (431,050–431,825)" }, { from: 432.0, to: 432.1, use: "CW, EME" }, { from: 432.1, to: 432.4, use: "SSB, CW, MGM" }, { from: 432.4, to: 432.49, use: "Svjetionici" }, { from: 432.5, to: 433.0, use: "Svi modovi" }, { from: 433.0, to: 433.6, use: "FM simpleks (433,400–433,600)" }, { from: 433.6, to: 435.0, use: "Svi modovi / digitalni" }, { from: 435.0, to: 438.0, use: "Sateliti" }, { from: 438.0, to: 440.0, use: "DV, ATV, izlazi repetitora (438,650–439,425, −7,6 MHz)" }] },
  { band: "23 cm", range: "1240 – 1300 MHz", unit: "MHz", classA: true, classP: false, key: "Uskopojasni centar 1296,200", segments: [
    { from: 1240, to: 1296, use: "ATV, DV, sateliti, repetitori" }, { from: 1296, to: 1296.8, use: "Uskopojasni (CW/SSB/EME)" }, { from: 1296.8, to: 1300, use: "Svi modovi, FM" }] },
];

export const EMERGENCY_COA = ["3760 kHz", "7110 kHz", "14300 kHz", "18160 kHz", "21360 kHz"];

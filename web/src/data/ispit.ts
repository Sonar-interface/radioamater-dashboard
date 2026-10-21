// Vježbovna ispitna pitanja (A i P razred), preneseno iz prethodnog dashboarda.
// Nisu službena: provjeriti uz važeći Pravilnik o amaterskoj radijskoj službi (NN 150/2022) i HAKOM.
export type Q = {
  s: number; // faza: 1 propisi, 2 tehnika, 3 postupci
  c: string; // "svi" | "A" | "P"
  q: string;
  a: string[];
  c_: number; // indeks točnog odgovora
  e: string;
  src?: string; // "kljuc" = ispitna pitanja s ključem, inače dodatna vježba
  ref?: string;
  warn?: string; // ključ odstupa od Pravilnika NN 150/22
};
export const STAGES: Record<number, string> = { 1: "Propisi", 2: "Tehnika", 3: "Postupci" };
export const QUESTIONS: Q[] = [
 {s:1,c:'svi',q:'Tko izdaje dozvolu za uporabu radiofrekvencijskog spektra u amaterskoj službi u Hrvatskoj?',a:['Savez (HRS)','HAKOM (Hrvatska regulatorna agencija za mrežne djelatnosti)','Ministarstvo mora','Lokalni radio klub'],c_:1,e:'Pravilnik: dozvolu izdaje Agencija. Bez položenog ispita i dozvole postaja se ne smije koristiti.'},
 {s:1,c:'svi',q:'Kome kandidat podnosi zahtjev za polaganje ispita?',a:['Izravno HAKOM-u','Savezu ili klubu','Ispitnom povjerenstvu u mjesecu prije','Nitko, ispit je prijavljen automatski'],c_:1,e:'Pisani zahtjev ide Savezu ili klubu, koji organizira ispit.'},
 {s:1,c:'svi',q:'Što se mora navesti u zahtjevu za polaganje ispita (prema Pravilniku NN 150/2022)?',a:['Samo pozivni znak','Ime i prezime, OIB i razred za koji se polaže','Samo adresa','Broj bankovnog računa'],c_:1,e:'Pravilnik propisuje ime, prezime, OIB i razred. Provjeri točan popis u članku o zahtjevu.'},
 {s:1,c:'svi',q:'Koliko članova ima ispitno povjerenstvo?',a:['Jednog','Tri (predsjednik i dva člana)','Pet','Nema povjerenstva'],c_:1,e:'Povjerenstvo čine predsjednik i dva člana.'},
 {s:1,c:'svi',q:'Koliko dana nakon održanog ispita Savez dostavlja Agenciji podatke o kandidatima?',a:['Odmah tog dana','Najkasnije 15 dana','30 dana','Godinu dana'],c_:1,e:'Savez dostavlja Agenciji najkasnije u roku od 15 dana od dana održavanja ispita.'},
 {s:1,c:'A',q:'Što se izdaje kandidatu koji položi ispit za A razred, na zahtjev?',a:['Certifikat za P razred','Certifikat HAREC (harmonizirani ispit u okviru CEPT-a)','Dozvola za satelit','Ništa'],c_:1,e:'Na zahtjev se izdaje HAREC certifikat.'},
 {s:1,c:'P',q:'Što se izdaje kandidatu koji položi ispit za P razred, na zahtjev?',a:['HAREC certifikat','Certifikat za položeni početnički ispit u okviru CEPT-a','Nema certifikata','Dozvola za VHF'],c_:1,e:'Za P razred izdaje se certifikat početničkog ispita u okviru CEPT-a.'},
 {s:1,c:'svi',q:'Što se događa ako kandidat ne položi ispit?',a:['Gubi pravo zauvijek','Može ponovno polagati uz novi zahtjev','Mora čekati pet godina','Ispit se priznaje'],c_:1,e:'Kandidat koji ne položi može ponovno polagati, uz podnošenje novog zahtjeva.'},
 {s:1,c:'A',q:'Kandidatima koji su položili B ili C razred prema ranijim propisima što se priznaje?',a:['Ništa','Položeni ispit za A razred','Samo P razred','Treba ponovno polagati sve'],c_:1,e:'Prema članku o prijelaznim odredbama, B i C razred priznaju se kao A razred.'},
 {s:1,c:'svi',q:'Zašto radioamater mora imati položen ispit prije postavljanja postaje?',a:['Zbog estetike','Jer je uporaba spektra regulirana, a ispit dokazuje znanje o propisima i tehnici','Zato što je to tradicija','Nije potrebno'],c_:1,e:'Uporaba spektra je regulirana; ispit i dozvola zajedno osiguravaju ispravnu i sigurnu uporabu.'},

 {s:2,c:'svi',q:'Ohmov zakon glasi:',a:['U = I / R','U = I × R','P = I / R','R = U × I'],c_:1,e:'U = I × R. Osnova za izračun struje, napona i otpora.'},
 {s:2,c:'svi',q:'Snaga u istosmjernom krugu, ako je poznat napon U i struja I:',a:['P = U + I','P = U × I','P = U / I','P = I²'],c_:1,e:'P = U × I (W = V × A).'},
 {s:2,c:'svi',q:'Što je decibel (dB) u radiotehnici?',a:['Jedinica frekvencije','Logaritamska mjera omjera snage ili napona','Jedinica otpora','Vrsta modulacije'],c_:1,e:'Decibel je logaritamski omjer. Povećanje od 3 dB približno udvostručuje snagu.'},
 {s:2,c:'svi',q:'Što znači SWR 1:1?',a:['Antena je savršeno prilagođena','Antena je neispravna','Nema signala','Snaga je dvostruka'],c_:0,e:'SWR 1:1 znači savršeno prilagođenje. Što je SWR veći, to je lošije prilagođenje.'},
 {s:2,c:'svi',q:'Čemu služi antenski tuner?',a:['Pojačava signal u antenu','Prilagođava impedanciju odašiljača i antene','Mjeri frekvenciju','Filtrira šum'],c_:1,e:'Tuner prilagođava impedanciju, čime smanjuje SWR i gubitke u napojnom vodu.'},
 {s:2,c:'A',q:'Što je propagacija kroz sloj F2 ionosfere?',a:['Lokalni VHF signal','Daljinske veze na KV pojasevima','Mikrovalna veza','Satelitska veza'],c_:1,e:'F2 sloj omogućuje dugodometne veze na KV pojasevima, osobito danju u solarnom maksimumu.'},
 {s:2,c:'P',q:'Zašto su VHF i UHF pojasevi u pravilu lokalni?',a:['Zbog zakona','Valovi se šire ravno i ne reflektiraju se od ionosfere (osim iznimki)','Zato što su slabi odašiljači','Zbog boje antene'],c_:1,e:'VHF/UHF valovi se obično šire kao direktni val, pa je domet ograničen horizontom (osim tropo, E-sporadic i odbijanja od planina).'},
 {s:2,c:'svi',q:'Što je LoRa?',a:['Vrsta kabela','Modulacija s raširenim spektrom (chirp), dugi domet uz malu brzinu i malu snagu','Vrsta repetitora','Vrsta antene'],c_:1,e:'LoRa koristi chirp spread spectrum; SF veći znači veći domet i manju brzinu.'},
 {s:2,c:'svi',q:'Što je Spreading Factor (SF) kod LoRa?',a:['Snaga odašiljača','Faktor raširenja: veći SF daje veći domet i sporiji prijenos','Broj kanala','Brzina procesora'],c_:1,e:'SF je u rasponu SF7 do SF12. Veći SF znači bolji doseg uz manju brzinu i dulji paket.'},
 {s:2,c:'svi',q:'Što je duty cycle?',a:['Frekvencija rada','Udio vremena u kojem uređaj smije odašiljati','Vrsta modulacije','Snaga antene'],c_:1,e:'Duty cycle (npr. 1 %) ograničava udio vremena predaje u EU pojasevima.'},
 {s:2,c:'svi',q:'Koji je najčešći uzrok smetnji (interference) na amaterskim pojasevima?',a:['Vremenske prilike','Neuzemljeni ili loše filtrirani uređaji i prevelika snaga u blizini','Mjesečeva faza','Ništa'],c_:1,e:'Smetnje često dolaze od loše zaštićene elektronike, lošeg uzemljenja i prejake snage.'},

 {s:3,c:'svi',q:'Što znači "73" u CW prometu?',a:['Frekvencija','Najbolje želje (pozdrav)','Pozivni znak','Snaga'],c_:1,e:'Tradicionalni CW pozdrav: "najbolje želje".'},
 {s:3,c:'svi',q:'Što je QSO?',a:['Vrsta antene','Kompletna veza između dviju stanica','Pozivni znak','Format QSL kartice'],c_:1,e:'QSO je potpuna dvosmjerna veza između dviju stanica.'},
 {s:3,c:'svi',q:'Što znači kratica QRZ?',a:['Pitanje tko me zove?','Mijenjam frekvenciju','Radim sam','Smetnje'],c_:0,e:'QRZ = tko me zove? (ili pitanje tko poziva).'},
 {s:3,c:'svi',q:'Koja riječ je u ITU fonetskoj abecedi za slovo "D"?',a:['Delta','Dog','Dolar','Dimitrij'],c_:0,e:'ITU fonetska abeceda: D = Delta.'},
 {s:3,c:'svi',q:'Kada se pozivni znak mora identificirati u zraku?',a:['Nikad','Na početku, na kraju veze i u propisanim intervalima','Samo na kraju dana','Samo na VHF'],c_:1,e:'Identifikacija se obavlja na početku, na kraju i u propisanim intervalima.'},
 {s:3,c:'A',q:'Što je hitna frekvencija i što se radi u slučaju nužde?',a:['Ne postoji','Koristi se za pomoć u nuždi uz poštivanje pravila','Uvijek se zove policija bez obzira','Nema pravila'],c_:1,e:'Pri nuždi se koriste hitni postupci i frekvencije, uz poštivanje propisa i traženje pomoći.'},
 {s:3,c:'P',q:'Što treba provjeriti prije predaje na frekvenciji?',a:['Samo vrijeme','Je li frekvencija slobodna i je li predaja dopuštena za tvoj razred','Ništa','Samo vrstu antene'],c_:1,e:'Slušaj (listen before talk), provjeri je li frekvencija slobodna i je li dopuštena za tvoj razred.'},
 {s:3,c:'svi',q:'Što znači skraćenica QSL?',a:['Pitanje o signalu','Potvrda primljene veze (kartica ili potvrda)','Zahtjev za snagu','Promjena pojasa'],c_:1,e:'QSL je potvrda o uspješnoj vezi.'},
 {s:3,c:'svi',q:'Što je RST sustav?',a:['Vrsta modulacije','Izvještaj o čitljivosti, snazi i tonu signala','Frekvencijski raspon','Tip antene'],c_:1,e:'RST: R = čitljivost (readability), S = snaga, T = ton (za CW).'}
];

# 🥗 Kalorientracker

Einfacher, **komplett kostenloser** Kalorien- und Protein-Tracker als Web-App fürs Handy (PWA, „Zum Home-Bildschirm“).

## Funktionen

- **Schnelleingabe in Alltagssprache**: „2 Eier, ein Toast mit Avocado und 200g Skyr“ → wird automatisch in Lebensmittel mit Mengen zerlegt (läuft offline, ohne KI-Kosten)
- **🎤 Spracheingabe** über die im Browser eingebaute Spracherkennung
- **▥ Barcode scannen** → Nährwerte aus [Open Food Facts](https://world.openfoodfacts.org) (kostenlos, sehr viele deutsche Produkte)
- **📸 Etikett fotografieren** → Texterkennung (Tesseract) direkt auf dem Handy liest kcal, Protein, KH, Fett aus
- **✍️ Selbst eintragen**: schnell nur Gesamtwerte oder genau pro 100 g
- Unbekannte Barcodes einmal fotografieren → beim nächsten Scan sofort da
- **Favoriten, „Zuletzt gegessen“ mit 1-Tipp-Hinzufügen, „Wie gestern“** pro Mahlzeit
- Tagesziele werden aus Größe/Gewicht/Alter/Aktivität berechnet (oder selbst festlegen)
- Verlauf (7/30 Tage) für Kalorien und Protein, Serie 🔥
- Hell/Dunkel-Modus, funktioniert offline
- Optional: **Firebase-Login** → Sync zwischen Geräten. Ohne Firebase wird alles lokal gespeichert.

## Lokal starten

```bash
npm install
npm run dev     # Entwicklungsserver
npm test        # Tests (Parser, Etikett-Erkennung, Ziele)
npm run build   # Produktions-Build nach dist/
```

> Kamera und Spracheingabe funktionieren nur über **HTTPS** (oder `localhost`). Zum Testen am Handy also am besten direkt die deployte Version nutzen.

## Deployment auf Cloudflare (kostenlos)

1. Im [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Import a repository** → dieses GitHub-Repo wählen.
2. Einstellungen:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (nutzt `wrangler.jsonc`)
3. Optional (für Login/Sync) unter **Settings → Build → Variables** die Firebase-Werte eintragen (siehe unten).
4. Deploy – fertig. Jeder Push auf `main` deployt automatisch neu.

Alternativ als klassisches **Cloudflare Pages**-Projekt: Build command `npm run build`, Output-Ordner `dist`.

## Firebase einrichten (optional, kostenloser Spark-Plan)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Projekt hinzufügen** (Google Analytics nicht nötig).
2. **Build → Authentication → Jetzt starten** → Anbieter **E-Mail/Passwort** und **Google** aktivieren.
3. **Authentication → Einstellungen → Autorisierte Domains** → deine Cloudflare-Domain hinzufügen (z. B. `kalorientracker.deinname.workers.dev`).
4. **Build → Firestore Database → Datenbank erstellen** (Standort `europe-west3` Frankfurt, Produktionsmodus).
5. Unter **Firestore → Regeln** den Inhalt von [`firestore.rules`](firestore.rules) einfügen und veröffentlichen (jede Person sieht nur ihre eigenen Daten).
6. **Projekteinstellungen → Allgemein → Deine Apps → Web-App (`</>`) hinzufügen** → die Werte aus `firebaseConfig` als Umgebungsvariablen setzen:

   | Variable | Wert aus firebaseConfig |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

   Lokal: `.env.example` nach `.env` kopieren und ausfüllen. Auf Cloudflare: als Build-Variablen eintragen und neu deployen.

Ohne diese Variablen läuft die App einfach im lokalen Modus. Wer sich später anmeldet, bekommt die bisherigen Einträge automatisch ins Konto übernommen.

## Auf dem Handy installieren

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → **Zum Home-Bildschirm**
- **Android (Chrome):** Seite öffnen → Menü ⋮ → **App installieren**

## Aufbau

```
src/
  lib/foods.ts      eingebaute Lebensmittel-Datenbank (~150 Grundnahrungsmittel)
  lib/parser.ts     versteht „2 Eier und ein Skyr“
  lib/off.ts        Open Food Facts (Barcode & Suche)
  lib/label.ts      Etikett-Texterkennung
  lib/nutrition.ts  Ziele & Berechnungen
  data/             Speicher: lokal oder Firebase
  components/       Oberfläche
```

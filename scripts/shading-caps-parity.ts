// ───────────────────────────────────────────────────────────────────────────
// Bedarf 48 — der Guard gegen die zweite Wahrheit ueber die Kamera-Faehigkeiten.
// Lauf: `npm run caps:parity` (im Drift-Job, der die Nachbar-Repos auscheckt)
//
// WORUM ES GEHT. Der „normalised command bus" lebt in `sony-camera-bridge`,
// `packages/web-rcp/src/capabilities.ts`: dort steht je Verbindungsweg, welche
// Befehle das jeweilige Backend WIRKLICH implementiert, und der Kopf jener
// Datei sagt es selbst — „Mirrors exactly what each backend's handleRcpCommand
// actually implements."
//
// Der multicam-planner braucht dieselbe Auskunft zur Planungszeit und kann sie
// nicht importieren: getrennte Repos, und der Planer laeuft im Browser ohne
// jede Verbindung zur Bridge. Er traegt deshalb eine KOPIE des Paint-Teils
// (`src/utils/shadingCapability.ts`, `MODE_PAINT`).
//
// Eine Kopie, die niemand nachhaelt, ist nach dem zweiten Backend-Commit eine
// Falschauskunft — und zwar die teuerste Sorte: sie steht auf einem gedruckten
// Blatt und sagt jemandem, er koenne vom Pult aus etwas einstellen, was das
// Backend gar nicht kennt. Dieser Lauf haelt beide gegeneinander.
//
// WARUM HIER UND NICHT IM PLANER. Der Planer hat in seiner eigenen CI keinen
// sony-camera-bridge-Checkout. Ein Guard, der sich dort IMMER uebersprungen
// haette, waere schlimmer als keiner: er saehe aus wie eine Pruefung. Die
// Suite checkt die Nachbar-Repos ohnehin aus (`planner-drift.mjs`), also
// laeuft er hier.
//
// WARUM VERHALTEN UND NICHT TEXT. Verglichen wird, was `capabilitiesForMode`
// ZURUECKGIBT — dieselbe Funktion, die die Bedienoberflaeche der Bridge fragt.
// Formatierung, Kommentare und die Reihenfolge der Zeilen sind egal; was
// zaehlt, ist die Antwort. (Dieselbe Begruendung wie bei
// `document-stamp-parity.ts`.)
// ───────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as pfad } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const SUITE = pfad(HIER, '..');

const argv = process.argv.slice(2);
const wert = (name: string, vorgabe: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : vorgabe;
};

/** Wo die Nachbar-Repos liegen. In CI legt der Drift-Job sie unter `upstream/`. */
const UPSTREAM = pfad(SUITE, wert('--upstream', '..'));
/** Die vendorte Kopie. Ueber `--planner` umlegbar, damit sich der Lauf gegen
 *  ein Upstream-Arbeitsverzeichnis proben laesst. */
const PLANER = pfad(SUITE, wert('--planner', 'apps/multicam-planner'));

const BRIDGE = pfad(UPSTREAM, 'sony-camera-bridge');
const CAPS = pfad(BRIDGE, 'packages/web-rcp/src/capabilities.ts');
const TYPEN = pfad(BRIDGE, 'packages/web-rcp/src/types.ts');
const KOPIE = pfad(PLANER, 'src/utils/shadingCapability.ts');

if (!existsSync(CAPS) || !existsSync(TYPEN)) {
  // Derselbe Umgang wie im Drift-Guard: ohne Upstream-Checkout wird
  // uebersprungen, damit fremde PRs nicht an einem fehlenden Leserecht
  // haengenbleiben. Der Satz ist mit Absicht laut — ein stiller Uebersprung
  // liest sich im Log wie eine bestandene Pruefung.
  console.log(
    `UEBERSPRUNGEN: kein sony-camera-bridge-Checkout unter ${BRIDGE}.\n` +
      '  Die Paritaet der Faehigkeits-Tabelle wurde NICHT geprueft.\n' +
      '  In CI checkt der Drift-Job das Repo aus; lokal: git clone neben die Suite.',
  );
  process.exit(0);
}
if (!existsSync(KOPIE)) {
  console.error(`FEHLER: ${KOPIE} fehlt — die vendorte Kopie ist nicht da, wo sie sein muss.`);
  process.exit(1);
}

const bridge = (await import(pathToFileURL(CAPS).href)) as {
  capabilitiesForMode: (mode: string | undefined) => Record<string, boolean>;
};
const planer = (await import(pathToFileURL(KOPIE).href)) as {
  MODE_PAINT: Record<string, readonly string[]>;
  PAINT_FUNCTIONS: readonly string[];
  CONTROL_PATH_LABEL: Record<string, string>;
  BRIDGE_SOURCE: { repo: string; file: string; symbol: string; commit: string };
};

const fehler: string[] = [];

// ── 1. Welche Wege es gibt ────────────────────────────────────────────────
//
// `ConnectionMode` ist ein Typ und zur Laufzeit nicht da. Gelesen wird
// deshalb der Quelltext — eng umrissen, und mit einer Untergrenze abgesichert:
// eine Regex, die nichts findet, verglichen sonst zwei leere Mengen und
// meldete Erfolg.
const union = /export type ConnectionMode =([\s\S]*?);/.exec(readFileSync(TYPEN, 'utf8'));
if (!union) {
  console.error(
    `FEHLER: Typ ConnectionMode in ${TYPEN} nicht gefunden — Guard nicht durchfuehrbar.`,
  );
  process.exit(1);
}
const bridgeWege = [...union[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).sort();
if (bridgeWege.length < 10) {
  console.error(
    `FEHLER: nur ${bridgeWege.length} Verbindungswege aus ${TYPEN} gelesen — das ist zu wenig, ` +
      'um eine Aussage zu sein. Hat sich die Schreibweise der Union geaendert?',
  );
  process.exit(1);
}

const planerWege = Object.keys(planer.CONTROL_PATH_LABEL)
  .filter((w) => w !== 'none')
  .sort();

for (const w of bridgeWege) {
  if (!planerWege.includes(w)) {
    fehler.push(`Weg "${w}" gibt es in der Bridge, aber nicht in der Kopie des Planers.`);
  }
}
for (const w of planerWege) {
  if (!bridgeWege.includes(w)) {
    fehler.push(`Weg "${w}" steht im Planer, die Bridge kennt ihn nicht (mehr).`);
  }
}

// ── 2. Sind die Paint-Namen ueberhaupt echte Felder? ──────────────────────
//
// Ohne diese Probe verglichen sich Tippfehler mit `undefined` — und
// `undefined === false` ist wahr. Der Guard waere dann fuer genau die Spalte
// blind, die jemand falsch geschrieben hat.
const alleFelder = bridge.capabilitiesForMode(undefined);
for (const fn of planer.PAINT_FUNCTIONS) {
  if (!(fn in alleFelder)) {
    fehler.push(
      `Paint-Funktion "${fn}" ist kein Feld von CameraCapabilities — die Spalte prueft nichts.`,
    );
  }
}

// ── 3. Die eigentliche Paritaet ───────────────────────────────────────────
for (const weg of bridgeWege.filter((w) => planerWege.includes(w))) {
  const echt = bridge.capabilitiesForMode(weg);
  const kopie = planer.MODE_PAINT[weg] ?? [];
  for (const fn of planer.PAINT_FUNCTIONS) {
    if (!(fn in alleFelder)) continue; // schon oben gemeldet
    const soll = echt[fn] === true;
    const ist = kopie.includes(fn);
    if (soll !== ist) {
      fehler.push(
        `${weg}.${fn}: Bridge sagt ${soll ? 'JA' : 'NEIN'}, die Kopie sagt ${ist ? 'JA' : 'NEIN'}.`,
      );
    }
  }
}

// ── 4. „von Hand am Body" ist leer, und bleibt es ─────────────────────────
if ((planer.MODE_PAINT.none ?? []).length > 0) {
  fehler.push('MODE_PAINT.none ist nicht leer — „von Hand am Body" kann nichts fernsteuern.');
}

// ── 5. Zeigt die Herkunftsangabe dorthin, wo wirklich geprueft wurde? ─────
if (planer.BRIDGE_SOURCE.repo !== 'sony-camera-bridge') {
  fehler.push(`BRIDGE_SOURCE.repo ist "${planer.BRIDGE_SOURCE.repo}", geprueft wurde sony-camera-bridge.`);
}
if (!CAPS.endsWith(planer.BRIDGE_SOURCE.file)) {
  fehler.push(
    `BRIDGE_SOURCE.file ist "${planer.BRIDGE_SOURCE.file}", geprueft wurde ${CAPS}. ` +
      'Die Angabe auf dem Blatt zeigt woandershin als der Guard.',
  );
}

if (fehler.length > 0) {
  console.error(
    `FEHLER: die Faehigkeits-Tabelle des multicam-planners weicht von sony-camera-bridge ab ` +
      `(${fehler.length} Abweichung(en)):\n` +
      fehler.map((f) => `  · ${f}`).join('\n') +
      '\n\nZu tun: `MODE_PAINT` in src/utils/shadingCapability.ts nachziehen und ' +
      'BRIDGE_SOURCE.commit auf den neuen Stand setzen — UPSTREAM im multicam-planner, ' +
      'nicht nur in der vendorten Kopie.',
  );
  process.exit(1);
}

console.log(
  `OK: ${bridgeWege.length} Verbindungswege × ${planer.PAINT_FUNCTIONS.length} Paint-Funktionen ` +
    'gegen sony-camera-bridge geprueft — die Kopie im multicam-planner stimmt.',
);

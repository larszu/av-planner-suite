// ───────────────────────────────────────────────────────────────────────────
// Die Kamera-TYPEN des Katalogs aus der Kameraliste des MultiCam-Planers.
//
// WARUM ERZEUGT UND NICHT VON HAND GEPFLEGT. Die 377 Modelle stehen im
// MultiCam-Planer mit ihren fachlichen Fakten (Sensor, Bajonett, Aufloesungen)
// — die gehoeren dorthin, sie versteht sonst niemand. Was ALLE Planer angeht,
// ist die Identitaet: Id, Hersteller, Modell, Kategorie, Datenblatt. Die
// steht im Paket.
//
// Zwei Listen fuer dieselben 377 Modelle waeren wieder die zweite Wahrheit,
// gegen die dieses ganze Paket geschrieben ist. Deshalb wird die eine aus der
// anderen ERZEUGT, und `katalog:parity` besteht darauf, dass sie es noch ist:
// wer im MultiCam-Planer eine Kamera ergaenzt und das Erzeugen vergisst, wird
// rot — nicht erst, wenn jemand sie im Cable-Planer sucht.
//
// Aufruf: node scripts/katalog-erzeugen.mjs [--pruefen]
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUELLE = join(WURZEL, 'apps/multicam-planner/src/data/cameras.ts')
const ZIEL = join(WURZEL, 'packages/device-catalog/src/kameraTypen.ts')
const CABLE_LIB = join(WURZEL, 'apps/cable-planner/src/renderer/lib')
const CABLE_ZIEL = join(WURZEL, 'packages/device-catalog/src/cableTypen.ts')
const LICHT_QUELLE = join(WURZEL, 'apps/light-planner/src/core/fixtureLibrary.ts')
const LICHT_ZIEL = join(WURZEL, 'packages/device-catalog/src/lichtTypen.ts')

// Das Plus bleibt: „Ninja V+" und „Ninja V" sind zwei Geraete. Begruendet in
// packages/device-catalog/src/identitaet.ts — dieselbe Regel, zwei Stellen,
// und `katalog:parity` haelt sie zusammen.
const normalisiere = (t) =>
  t.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim().replace(/\s+/g, ' ')
const abgeleiteteTypId = (h, m) =>
  `abgeleitet:${normalisiere(h).replace(/ /g, '-')}:${normalisiere(m).replace(/ /g, '-')}`

/**
 * Eine Zeile der Kameraliste -> ein Typ-Eintrag.
 *
 * `bekannt` ist die Liste der Cable-Eintraege: traegt einer davon denselben
 * Namen, ist es DASSELBE Modell und bekommt DESSEN gewachsene Id.
 *
 * ─── WARUM DAS HIER STEHT UND NICHT IM MERGE ───────────────────────────────
 *
 * Die Kameraliste setzt `deviceTypeId` bereits von Hand — „gesetzt fuer
 * Modelle, deren echte I/O im Cable-Planner-Katalog hinterlegt ist", steht
 * dort woertlich. Neun sind so gepflegt. Drei weitere haben denselben Namen
 * und wurden uebersehen: Blackmagic Studio Camera 4K Pro G2, URSA Mini Pro
 * 12K, Sony PXW-Z280.
 *
 * Ohne diese Zeile bekaemen sie eine ABGELEITETE Id und stuenden damit
 * ZWEIMAL im Katalog — einmal mit Ports, einmal ohne. Und weil
 * `katalogTemplate` bei Mehrdeutigkeit bewusst NICHT raet, verloere ein
 * Geraet dieses Modells beim naechsten Seed seine Anschluesse. Gemessen am
 * 2026-09-19, bevor es jemand im Plan bemerkt haette.
 *
 * Abgeglichen wird der VOLLE Name („Blackmagic" + „Studio Camera 4K Pro G2"
 * gegen „Blackmagic Studio Camera 4K Pro G2"), normalisiert. Das ist kein
 * Raten aus einem Instanznamen (ADR-002), sondern der Abgleich zweier
 * KATALOG-Zeilen, die dasselbe Modell benennen — und `katalog:parity` haelt
 * das Ergebnis fest.
 */
export function lies(quelltext, bekannt = []) {
  const jeName = new Map(bekannt.map((e) => [normalisiere(e.modell), e.id]))
  const treffer = [...quelltext.matchAll(
    /\{\s*id: '([^']+)'[^\n]*?manufacturer: '([^']+)', model: '([^']+)'/g,
  )]
  return treffer.map((m) => {
    const zeile = m[0]
    const gewachsen = /deviceTypeId: '([^']+)'/.exec(zeile)?.[1]
    const url = /manufacturerUrl: '([^']+)'/.exec(zeile)?.[1]
    const gleichnamig = jeName.get(normalisiere(`${m[2]} ${m[3]}`))
    return {
      // Die GEWACHSENE Id gewinnt immer: sie steht in Projektdateien und
      // Lagerpositionen. Dann die Id des gleichnamigen Cable-Eintrags — es
      // ist dasselbe Modell, und zwei Ids dafuer waeren zwei Geraete. Erst
      // danach wird eine abgeleitet.
      id: gewachsen ?? gleichnamig ?? abgeleiteteTypId(m[2], m[3]),
      hersteller: m[2],
      modell: m[3],
      kategorie: 'Cameras',
      ...(url ? { datenblattUrl: url } : {}),
    }
  })
}

const zeileVon = (e) =>
  `  { id: ${JSON.stringify(e.id)}, hersteller: ${JSON.stringify(e.hersteller)}, ` +
  `modell: ${JSON.stringify(e.modell)}, kategorie: 'Cameras'` +
  (e.datenblattUrl ? `, datenblattUrl: ${JSON.stringify(e.datenblattUrl)}` : '') +
  ` },`

export function baue(eintraege) {
  return `// ───────────────────────────────────────────────────────────────────────────
// ERZEUGT von scripts/katalog-erzeugen.mjs aus
// apps/multicam-planner/src/data/cameras.ts — NICHT von Hand aendern.
//
// Hier steht nur die IDENTITAET eines Kameramodells: Id, Hersteller, Modell,
// Kategorie, Datenblatt. Die fachlichen Fakten (Sensor, Bajonett,
// Aufloesungen, Sensormodi) bleiben im MultiCam-Planer — sie versteht sonst
// niemand, und ein Paket, das sie fuehrte, waere der MultiCam-Planer mit
// anderem Namen.
//
// \`npm run katalog:parity\` besteht darauf, dass diese Datei noch aus jener
// stammt.
// ───────────────────────────────────────────────────────────────────────────
import type { TypEingabe } from './typ'

/** ${eintraege.length} Kameramodelle. */
export const KAMERA_TYPEN: readonly TypEingabe[] = [
${eintraege.map(zeileVon).join('\n')}
]
`
}

/**
 * Die Katalog-Eintraege des Cable-Planers -> Typ-Eintraege.
 *
 * KEIN Hersteller: dort steht „AJA KUMO 1616-12G" in EINEM Feld. Das
 * auseinanderzuschneiden waere Raten an genau der Stelle, an der ADR-002 es
 * verbietet. Folgenlos fuer die Id — alle 467 tragen eine gewachsene GUID.
 */
/**
 * Die Kategorie-Konstanten einer Katalogdatei (`const CAM = 'Cameras'`).
 *
 * Fuenf der neunzehn Kataloge schreiben die Kategorie nicht als Zeichenkette
 * an den Eintrag, sondern als Konstante oben in der Datei. Wer nur nach
 * `category: '` sucht, uebersieht sie — am 2026-09-19 waren das 117 von 467
 * Eintraegen, und zwar STUMM. Deshalb werden beide Formen gelesen.
 */
function kategorieKonstanten(quelltext) {
  const map = new Map()
  for (const m of quelltext.matchAll(/^const\s+([A-Z][A-Z0-9_]*)\s*=\s*'([^']+)'/gm)) {
    map.set(m[1], m[2])
  }
  return map
}

export function liesCable(quelltext) {
  // Je Eintrag EIN Abschnitt, geschnitten an `deviceTypeId:` mit einem Wert.
  // Kein Zeichenfenster: die Eintraege sind verschieden lang (ein Mischer mit
  // 40 Eingaengen fuellt mehrere Bildschirme), und ein zu enges Fenster liess
  // am 2026-09-19 stumm 117 von 467 herausfallen. Ein Zaehler unten faengt
  // genau das ab, statt es zu einem halben Katalog werden zu lassen.
  const konstanten = kategorieKonstanten(quelltext)
  const abschnitte = quelltext.split(/deviceTypeId: '/).slice(1)
  const eintraege = []
  for (const roh of abschnitte) {
    const id = /^([^']+)'/.exec(roh)?.[1]
    if (!id) continue
    // Das erste `name:`, dem unmittelbar `category:` folgt — das ist der
    // Template-Kopf. Port-Namen tragen kein `category` hinter sich.
    // Die Kategorie steht als Zeichenkette ODER als Konstante.
    const kopf = /name: '([^']+)',\s*\n\s*category: (?:'([^']+)'|([A-Z][A-Z0-9_]*))/.exec(roh)
    if (!kopf) continue
    const kategorie = kopf[2] ?? konstanten.get(kopf[3])
    if (!kategorie) continue
    const url = /manufacturerUrl: '([^']+)'/.exec(roh.slice(0, kopf.index + 200))?.[1]
    eintraege.push({
      id,
      modell: kopf[1],
      kategorie,
      ...(url ? { datenblattUrl: url } : {}),
    })
  }
  return eintraege
}

const zeileCable = (e) =>
  `  { id: ${JSON.stringify(e.id)}, modell: ${JSON.stringify(e.modell)}, ` +
  `kategorie: ${JSON.stringify(e.kategorie)}` +
  (e.datenblattUrl ? `, datenblattUrl: ${JSON.stringify(e.datenblattUrl)}` : '') +
  ` },`

export function baueCable(eintraege) {
  return `// ───────────────────────────────────────────────────────────────────────────
// ERZEUGT von scripts/katalog-erzeugen.mjs aus den *Catalog.ts des
// Cable-Planers — NICHT von Hand aendern.
//
// Hier steht nur die IDENTITAET: Id, Modell, Kategorie, Datenblatt. Die
// Ports, Steckertypen und Masse bleiben beim Cable-Planer; ein Paket, das sie
// fuehrte, zoege den halben Kabelgraph mit.
//
// OHNE HERSTELLER-FELD, weil die Quelle keines fuehrt („AJA KUMO 1616-12G"
// steht in einem Feld). Ein Schnitt nach Leerzeichen waere geraten.
//
// \`npm run katalog:parity\` besteht darauf, dass diese Datei noch aus jenen
// stammt.
// ───────────────────────────────────────────────────────────────────────────
import type { TypEingabe } from './typ'

/** ${eintraege.length} Geraetemodelle aus den Katalogen des Cable-Planers. */
export const CABLE_TYPEN: readonly TypEingabe[] = [
${eintraege.map(zeileCable).join('\n')}
]
`
}

/**
 * Die Fixture-Bibliothek des Licht-Planers -> Typ-Eintraege.
 *
 * Die Kategorie wird auf `Lights` vereinheitlicht: dort steht sie als
 * Bauform („profile", „moving-spot", „fresnel"), und das ist eine Angabe des
 * LICHT-Planers ueber das Geraet, keine Zuordnung zu einem Plan. Die
 * Zuordnung macht `KATEGORIE_GEWERKE` in `@avplan/ui`, und die braucht
 * „gehoert in den Lichtplan" — nicht „ist ein Profiler".
 *
 * KEIN DATENBLATT: die Bibliothek fuehrt keinen einzigen Herstellerlink. Das
 * ist eine Aussage und kein Versehen dieses Skripts — `ohneBeleg` zaehlt die
 * 84 Eintraege, und die Zahl steht im Test. Wer sie senken will, traegt
 * Links ein; wer sie versteckt, macht aus einem bekannten Loch ein
 * unbekanntes.
 */
export function liesLicht(quelltext, bekannt = []) {
  const jeName = new Map(bekannt.map((e) => [normalisiere(e.modell), e.id]))
  const treffer = [...quelltext.matchAll(
    /id: '([^']+)', name: '([^']+)', manufacturer: '([^']+)'/g,
  )]
  return treffer.map((m) => {
    const gleichnamig = jeName.get(normalisiere(`${m[3]} ${m[2]}`))
    return {
      id: gleichnamig ?? abgeleiteteTypId(m[3], m[2]),
      hersteller: m[3],
      modell: m[2],
      kategorie: 'Lights',
    }
  })
}

const zeileLicht = (e) =>
  `  { id: ${JSON.stringify(e.id)}, hersteller: ${JSON.stringify(e.hersteller)}, ` +
  `modell: ${JSON.stringify(e.modell)}, kategorie: 'Lights' },`

export function baueLicht(eintraege) {
  return `// ───────────────────────────────────────────────────────────────────────────
// ERZEUGT von scripts/katalog-erzeugen.mjs aus
// apps/light-planner/src/core/fixtureLibrary.ts — NICHT von Hand aendern.
//
// Nur die IDENTITAET: Id, Hersteller, Modell, Kategorie. Lichtstrom,
// Abstrahlwinkel, Photometrie und Bauform bleiben im Licht-Planer — sie
// versteht sonst niemand.
//
// OHNE DATENBLATT-LINK, weil die Bibliothek keinen fuehrt. Das ist eine
// Aussage: \`ohneBeleg\` zaehlt diese ${eintraege.length} Eintraege.
//
// \`npm run katalog:parity\` besteht darauf, dass diese Datei noch aus jener
// stammt.
// ───────────────────────────────────────────────────────────────────────────
import type { TypEingabe } from './typ'

/** ${eintraege.length} Leuchtenmodelle aus der Bibliothek des Licht-Planers. */
export const LICHT_TYPEN: readonly TypEingabe[] = [
${eintraege.map(zeileLicht).join('\n')}
]
`
}

function cableEintraege() {
  const dateien = readdirSync(CABLE_LIB).filter((f) => f.endsWith('Catalog.ts')).sort()
  return dateien.flatMap((f) => liesCable(readFileSync(join(CABLE_LIB, f), 'utf8')))
}

const cable = cableEintraege()
const eintraege = lies(readFileSync(QUELLE, 'utf8'), cable)
const licht = liesLicht(readFileSync(LICHT_QUELLE, 'utf8'), cable)
if (eintraege.length < 300) {
  console.error(`katalog:erzeugen: nur ${eintraege.length} Kameras erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}
if (cable.length < 400) {
  console.error(`katalog:erzeugen: nur ${cable.length} Cable-Eintraege erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}

if (licht.length < 60) {
  console.error(`katalog:erzeugen: nur ${licht.length} Leuchten erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}

const inhalt = baue(eintraege)
const inhaltCable = baueCable(cable)
const inhaltLicht = baueLicht(licht)

if (process.argv.includes('--pruefen')) {
  let rot = false
  if (readFileSync(ZIEL, 'utf8') !== inhalt) {
    console.error('katalog:parity: kameraTypen.ts stammt nicht mehr aus der Kameraliste des MultiCam-Planers.')
    rot = true
  }
  if (readFileSync(CABLE_ZIEL, 'utf8') !== inhaltCable) {
    console.error('katalog:parity: cableTypen.ts stammt nicht mehr aus den Katalogen des Cable-Planers.')
    rot = true
  }
  if (readFileSync(LICHT_ZIEL, 'utf8') !== inhaltLicht) {
    console.error('katalog:parity: lichtTypen.ts stammt nicht mehr aus der Fixture-Bibliothek.')
    rot = true
  }
  if (rot) {
    console.error('  Erzeugen mit: npm run katalog:erzeugen')
    process.exit(1)
  }
  console.log(`katalog:parity ok — ${cable.length} Cable-, ${eintraege.length} Kamera-, ${licht.length} Licht-Typen, alle erzeugt.`)
} else {
  writeFileSync(ZIEL, inhalt)
  writeFileSync(CABLE_ZIEL, inhaltCable)
  writeFileSync(LICHT_ZIEL, inhaltLicht)
  console.log(`katalog:erzeugen ok — ${cable.length} Cable-, ${eintraege.length} Kamera-, ${licht.length} Licht-Typen.`)
}

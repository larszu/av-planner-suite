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

const normalisiere = (t) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
const abgeleiteteTypId = (h, m) =>
  `abgeleitet:${normalisiere(h).replace(/ /g, '-')}:${normalisiere(m).replace(/ /g, '-')}`

/** Eine Zeile der Kameraliste -> ein Typ-Eintrag. */
export function lies(quelltext) {
  const treffer = [...quelltext.matchAll(
    /\{\s*id: '([^']+)'[^\n]*?manufacturer: '([^']+)', model: '([^']+)'/g,
  )]
  return treffer.map((m) => {
    const zeile = m[0]
    const gewachsen = /deviceTypeId: '([^']+)'/.exec(zeile)?.[1]
    const url = /manufacturerUrl: '([^']+)'/.exec(zeile)?.[1]
    return {
      // Die GEWACHSENE Id gewinnt immer: sie steht in Projektdateien und
      // Lagerpositionen. Nur wo keine ist, wird eine abgeleitet.
      id: gewachsen ?? abgeleiteteTypId(m[2], m[3]),
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

function cableEintraege() {
  const dateien = readdirSync(CABLE_LIB).filter((f) => f.endsWith('Catalog.ts')).sort()
  return dateien.flatMap((f) => liesCable(readFileSync(join(CABLE_LIB, f), 'utf8')))
}

const eintraege = lies(readFileSync(QUELLE, 'utf8'))
const cable = cableEintraege()
if (eintraege.length < 300) {
  console.error(`katalog:erzeugen: nur ${eintraege.length} Kameras erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}
if (cable.length < 400) {
  console.error(`katalog:erzeugen: nur ${cable.length} Cable-Eintraege erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}

const inhalt = baue(eintraege)
const inhaltCable = baueCable(cable)

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
  if (rot) {
    console.error('  Erzeugen mit: npm run katalog:erzeugen')
    process.exit(1)
  }
  console.log(`katalog:parity ok — ${eintraege.length} Kameratypen + ${cable.length} Cable-Typen, beide erzeugt.`)
} else {
  writeFileSync(ZIEL, inhalt)
  writeFileSync(CABLE_ZIEL, inhaltCable)
  console.log(`katalog:erzeugen ok — ${eintraege.length} Kameratypen, ${cable.length} Cable-Typen.`)
}

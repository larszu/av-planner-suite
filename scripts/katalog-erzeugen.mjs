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
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUELLE = join(WURZEL, 'apps/multicam-planner/src/data/cameras.ts')
const ZIEL = join(WURZEL, 'packages/device-catalog/src/kameraTypen.ts')

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

const eintraege = lies(readFileSync(QUELLE, 'utf8'))
if (eintraege.length < 300) {
  console.error(`katalog:erzeugen: nur ${eintraege.length} Kameras erkannt — die Quelle hat sich geaendert.`)
  process.exit(1)
}
const inhalt = baue(eintraege)

if (process.argv.includes('--pruefen')) {
  const da = readFileSync(ZIEL, 'utf8')
  if (da !== inhalt) {
    console.error('katalog:parity: kameraTypen.ts stammt nicht mehr aus der Kameraliste des MultiCam-Planers.')
    console.error('  Erzeugen mit: npm run katalog:erzeugen')
    process.exit(1)
  }
  console.log(`katalog:parity ok — ${eintraege.length} Kameratypen, erzeugt aus der Kameraliste.`)
} else {
  writeFileSync(ZIEL, inhalt)
  console.log(`katalog:erzeugen ok — ${eintraege.length} Kameratypen nach packages/device-catalog/src/kameraTypen.ts`)
}

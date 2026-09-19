// ───────────────────────────────────────────────────────────────────────────
// Die Grenze zum Plan — gemessen, nicht behauptet (ADR-006).
// Lauf: `npm run grenze:check --workspace @avplan/crew-core`
//
// WOGEGEN DAS GESCHRIEBEN IST. „Crew & Geld" lag bis 2026-09-19 im
// Cable-Planer. Herausschneiden liess es sich, weil `types/labour.ts` KEINEN
// einzigen Import hatte — die Domaene hing nie am Kabelgraph. Genau das ist
// die Eigenschaft, die verlorengehen kann, und zwar mit einer Zeile: ein
// `import type { EquipmentItem }` ist schnell geschrieben, sieht harmlos aus
// und ist in dem Moment sogar praktisch.
//
// Bemerkt wuerde es erst beim Umzug ins eigene Repo (Schritt 3) — also dann,
// wenn es teuer ist. Derselbe Waechter steht aus demselben Grund im
// `inventory-planner` und im `larszu-facility-planner`.
//
// DIE REGEL: Saetze, Stunden, Auslagen und Belege gehoeren der Firma, nicht
// dem Plan. Der Plan liefert nur den Job-Bezug.
// ───────────────────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const WURZEL = new URL('../src/', import.meta.url).pathname

/**
 * Bezeichner, die dem PLAN gehoeren und hier nichts zu suchen haben.
 *
 * Aufgezaehlt und nicht gemustert: ein Muster wie /Equipment/ traefe auch
 * harmlose eigene Namen, und ein Waechter, der bei richtigem Code anschlaegt,
 * wird abgeschaltet statt gelesen.
 */
const PLAN_BEZEICHNER = [
  'EquipmentItem',
  'CablePlannerProject',
  'CostAnchor',
  'deriveDemand',
  'SeedGeraet',
  'SuiteSeed',
]

/**
 * Quelltext ohne Kommentare.
 *
 * WARUM (2026-09-19, beim ersten Lauf gefunden): der Kopf von `index.ts`
 * ERKLAERT, warum `CostAnchor` hier nicht hingehoert — und der Waechter
 * schlug darauf an. Ein Waechter, der die Begruendung seiner eigenen Regel
 * als Verstoss meldet, ist ein Fehlalarm, und an Fehlalarmen sterben
 * Waechter: sie werden abgeschaltet statt gelesen.
 */
const ohneKommentare = (q) =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

const dateien = (dir) =>
  readdirSync(dir).flatMap((e) => {
    const voll = join(dir, e)
    return statSync(voll).isDirectory() ? dateien(voll) : /\.ts$/.test(e) ? [voll] : []
  })

const befunde = []
for (const datei of dateien(WURZEL)) {
  const quelle = ohneKommentare(readFileSync(datei, 'utf8'))
  const rel = relative(WURZEL, datei)

  // 1. Kein Import aus einem anderen Paket oder Planer. Diese Domaene steht
  //    fuer sich; sie darf hoechstens ihre eigenen Dateien lesen.
  for (const m of quelle.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)) {
    const pfad = m[1]
    if (!pfad.startsWith('./') && !pfad.startsWith('../')) {
      befunde.push(`${rel}: importiert „${pfad}" — dieses Paket haengt an nichts.`)
    }
    if (pfad.startsWith('../')) {
      befunde.push(`${rel}: importiert „${pfad}" — das liegt ausserhalb des Pakets.`)
    }
  }

  // 2. Keine Plan-Bezeichner, auch nicht als Typ.
  for (const name of PLAN_BEZEICHNER) {
    if (new RegExp(`\\b${name}\\b`).test(quelle)) {
      befunde.push(`${rel}: nennt „${name}" — das gehoert dem Plan (ADR-006).`)
    }
  }
}

if (befunde.length > 0) {
  console.error(`grenze:check: ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.error(`  ! ${b}`)
  console.error('\nSaetze, Stunden, Auslagen und Belege gehoeren der Firma, nicht dem Plan.')
  console.error('Der Plan liefert nur den Job-Bezug — er fragt dieses Paket, nicht umgekehrt.')
  process.exit(1)
}

console.log(
  `grenze:check ok — ${dateien(WURZEL).length} Dateien, kein Import nach draussen, kein Plan-Bezeichner.`,
)

// ───────────────────────────────────────────────────────────────────────────
// seed:check — jeder mitgelieferte Planer in der Leiste hat einen Datenweg.
//
// WARUM ES DAS GIBT (2026-09-18). Gemessen an diesem Tag: `SeedDomain` führte
// drei Domänen — `cameras`, `fixtures`, `signal`. In der Modul-Leiste standen
// aber FÜNF mitgelieferte Planer; Lager (Modul 5, seit `suite#99`) und Gebäude
// (Modul 6) waren eingebettete Oberflächen ohne jede Datenverbindung. Im
// `inventory-planner` stand `seedAusBedarf` als „der einzige Schreibweg vom
// Plan hierher" in der CLAUDE.md — aufgerufen wurde er von nichts ausser
// seinen eigenen Tests.
//
// Das ist dieselbe Defektform wie B-18 („die Shell hört, aber niemand ruft"),
// nur eine Ebene höher: nicht ein fehlender Sender, sondern eine fehlende
// Leitung. Und sie fällt von selbst nicht auf — ein Modul, das nichts
// bekommt, sieht aus wie ein Modul, in dem noch nichts steht.
//
// Deshalb misst dieser Wächter nicht, ob der Datenweg GUT ist, sondern nur,
// ob es ihn GIBT: ein Planer in der Leiste ruft `connectShellSeed` mit einer
// Domäne, die `SeedDomain` kennt. Wer einen sechsten Planer einhängt, wird
// hier rot — und nicht erst, wenn jemand meldet, dass die Sicht leer bleibt.
//
// NICHT GEMESSEN: ob der Planer den Seed sinnvoll verwendet, und ob die
// Rückmeldung stimmt. Das prüfen die Tests der jeweiligen Brücke.
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const WURZEL = new URL('..', import.meta.url).pathname
const REGISTRY = join(WURZEL, 'apps/shell/src/modules/registry.ts')
const SEED = join(WURZEL, 'packages/ui/src/seed.ts')

/** `planner`-Kennung der Registry -> Ordner unter `apps/`. */
const ORDNER = {
  cable: 'cable-planner',
  multicam: 'multicam-planner',
  light: 'light-planner',
  inventory: 'inventory-planner',
  facility: 'larszu-facility-planner',
}

const quelle = (datei) => readFileSync(datei, 'utf8')

/** Die Planer-Kennungen, die wirklich in der Leiste stehen. */
function plannerAusRegistry() {
  const text = quelle(REGISTRY)
  // Nur die Eintraege in MODULES, nicht die Typdefinition darueber: die Union
  // in `ModuleDef.planner` nennt jede moegliche Kennung und waere damit kein
  // Mass fuer das, was eingehaengt IST.
  const ab = text.indexOf('export const MODULES')
  if (ab < 0) throw new Error('registry.ts: `export const MODULES` nicht gefunden')
  return [...new Set([...text.slice(ab).matchAll(/^\s*planner:\s*'([a-z]+)'/gm)].map((m) => m[1]))]
}

/** Die Domaenen, die das Protokoll kennt. */
function domaenen() {
  const text = quelle(SEED)
  const zeile = text.match(/export type SeedDomain =([^\n]+)/)
  if (!zeile) throw new Error('seed.ts: `SeedDomain` nicht gefunden')
  return [...zeile[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
}

/** Alle `.ts`/`.tsx` unter einem Ordner, ohne node_modules und dist. */
function dateien(ordner, raus = []) {
  for (const eintrag of readdirSync(ordner)) {
    if (eintrag === 'node_modules' || eintrag === 'dist' || eintrag === '.git') continue
    const pfad = join(ordner, eintrag)
    if (statSync(pfad).isDirectory()) dateien(pfad, raus)
    else if (/\.tsx?$/.test(eintrag)) raus.push(pfad)
  }
  return raus
}

/** Die Domaene, mit der ein Planer `connectShellSeed` aufruft — oder null. */
function domaeneDesPlaners(ordner) {
  for (const datei of dateien(join(WURZEL, 'apps', ordner, 'src'))) {
    const treffer = quelle(datei).match(/connectShellSeed\(\s*\{[^}]*?domain:\s*'([a-z]+)'/s)
    if (treffer) return { domain: treffer[1], datei }
  }
  return null
}

const bekannt = domaenen()
const fehler = []
const zeilen = []

for (const planer of plannerAusRegistry()) {
  const ordner = ORDNER[planer]
  if (!ordner) {
    fehler.push(`Registry nennt den Planer „${planer}", dieses Skript kennt seinen Ordner nicht.`)
    continue
  }
  const anschluss = domaeneDesPlaners(ordner)
  if (!anschluss) {
    fehler.push(
      `„${planer}" (apps/${ordner}) steht in der Leiste, ruft aber nirgends connectShellSeed — ` +
        'eine eingebettete Oberflaeche ohne Datenweg.',
    )
    continue
  }
  if (!bekannt.includes(anschluss.domain)) {
    fehler.push(
      `„${planer}" meldet sich als Domaene „${anschluss.domain}" an, die SeedDomain nicht kennt ` +
        `(${anschluss.datei.replace(WURZEL, '')}).`,
    )
    continue
  }
  zeilen.push(`  ${planer.padEnd(9)} -> ${anschluss.domain}`)
}

if (fehler.length) {
  console.error('seed:check FEHLGESCHLAGEN\n')
  for (const f of fehler) console.error(`  - ${f}`)
  console.error('')
  process.exit(1)
}

console.log(`seed:check ok — ${zeilen.length} mitgelieferte Planer, jeder mit Datenweg:`)
console.log(zeilen.join('\n'))
console.log('NICHT gemessen: ob der Seed drueben sinnvoll verwendet wird — das pruefen die Bruecken-Tests.')

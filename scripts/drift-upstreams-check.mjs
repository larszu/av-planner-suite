#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Jeder vendorte Planer unter apps/ hat im Drift-Job seinen Upstream.
//
// WARUM ES DAS GIBT. Der Drift-Job checkte bis 2026-09-28 nur cable, multicam
// und light aus. Fuer inventory und facility fand `planner-drift.mjs` keinen
// Upstream, meldete „upstream checkout not found" — und blieb gruen, weil der
// Guard fremde PRs nie blockieren soll. Die beiden Checkouts standen zwar im
// Workflow, aber im FALSCHEN Job (`build-test`, unter `suite/upstream/`),
// wo nichts sie las. Gemerkt hat es niemand: facility lief upstream um #19
// weiter, lokal stieg die Drift von 4 auf 10, CI sagte nichts.
//
// WIE ER PRUEFT. Drei Listen muessen gleich sein:
//   1. die Ordner unter apps/ (ohne die Suite-eigenen, unten mit Grund),
//   2. `APPS` in scripts/planner-drift.mjs,
//   3. die Checkouts im Job `planner-drift` von .github/workflows/ci.yml —
//      `repository: larszu/<app>`, `path: upstream/<app>`, `fetch-depth: 0`
//      (ohne volle Historie loest der Guard die Baseline-Sha nicht auf).
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Ordner unter apps/, die kein eigenes Upstream-Repo haben. */
const SUITE_EIGEN = {
  shell: 'die Suite selbst — sie wird nicht vendoriert, sie vendoriert',
}

const fehler = []

const ordner = readdirSync(join(ROOT, 'apps'))
  .filter((n) => statSync(join(ROOT, 'apps', n)).isDirectory())
  .filter((n) => !(n in SUITE_EIGEN))
  .sort()

const driftSrc = readFileSync(join(ROOT, 'scripts/planner-drift.mjs'), 'utf8')
const appsZeile = /const APPS = \[([^\]]*)\]/.exec(driftSrc)
if (!appsZeile) fehler.push('scripts/planner-drift.mjs: `const APPS = [...]` nicht gefunden')
const apps = [...(appsZeile?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()

for (const n of ordner) if (!apps.includes(n)) fehler.push(`apps/${n} fehlt in APPS von planner-drift.mjs`)
for (const n of apps) if (!ordner.includes(n)) fehler.push(`APPS nennt ${n}, aber apps/${n} gibt es nicht`)
for (const n of Object.keys(SUITE_EIGEN)) {
  if (apps.includes(n)) fehler.push(`${n} ist als Suite-eigen eingetragen und steht trotzdem in APPS`)
}

const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8')
/** Der Block eines Jobs: von `  <name>:` bis zum naechsten Job gleicher Tiefe. */
const job = (name) => {
  const start = ci.search(new RegExp(`^  ${name}:\\s*$`, 'm'))
  if (start < 0) return null
  const rest = ci.slice(start + 1)
  const ende = rest.search(/^ {2}[A-Za-z0-9_-]+:\s*$/m)
  return ende < 0 ? rest : rest.slice(0, ende)
}
const ohneKommentare = (s) => s.split('\n').filter((z) => !/^\s*#/.test(z)).join('\n')
const schritte = (block) => ohneKommentare(block).split(/^\s{6}- /m).slice(1)

const drift = job('planner-drift')
if (!drift) fehler.push('ci.yml: Job `planner-drift` nicht gefunden')
const checkouts = new Map()
for (const s of drift ? schritte(drift) : []) {
  const repo = /repository:\s*larszu\/([\w.-]+)/.exec(s)?.[1]
  if (repo) checkouts.set(repo, s)
}
for (const n of apps) {
  const s = checkouts.get(n)
  if (!s) {
    fehler.push(`ci.yml: Job planner-drift checkt larszu/${n} nicht aus`)
    continue
  }
  if (!new RegExp(`path:\\s*upstream/${n}\\s*$`, 'm').test(s)) {
    fehler.push(`ci.yml: larszu/${n} liegt nicht unter upstream/${n} (dort sucht --upstream ../upstream)`)
  }
  if (!/fetch-depth:\s*0\b/.test(s)) fehler.push(`ci.yml: larszu/${n} ohne fetch-depth: 0`)
}

if (fehler.length) {
  console.error('drift-upstreams:check:')
  for (const f of fehler) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`drift-upstreams:check ok — ${apps.length} Planer, jeder mit Upstream im Drift-Job: ${apps.join(', ')}.`)

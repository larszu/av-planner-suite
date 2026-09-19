// ───────────────────────────────────────────────────────────────────────────
// Die Grenze zum Plan, als Test (ADR-006).
//
// Der Waechter `scripts/plan-grenze-check.mjs` misst dasselbe und laeuft im
// CI. Dieser Test hier laeuft bei `npm test` mit, damit der Befund schon beim
// Schreiben kommt und nicht erst beim Push.
//
// WAS ER ZUSICHERT: diese Domaene haengt an nichts. Genau deshalb liess sie
// sich am 2026-09-19 aus dem Cable-Planer herausschneiden, ohne dass etwas
// brach — `types/labour.ts` hatte keinen einzigen Import. Die Eigenschaft
// geht mit EINER Zeile verloren, und bemerkt wuerde es erst beim Umzug ins
// eigene Repo (Schritt 3), also dann, wenn es teuer ist.
// ───────────────────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WURZEL = new URL('../src/', import.meta.url).pathname

const dateien = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const voll = join(dir, e)
    return statSync(voll).isDirectory() ? dateien(voll) : /\.ts$/.test(e) ? [voll] : []
  })

const ohneKommentare = (q: string): string =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

describe('Crew & Geld haengt an nichts', () => {
  it('importiert nichts von ausserhalb des Pakets', () => {
    const fremd: string[] = []
    for (const datei of dateien(WURZEL)) {
      const quelle = ohneKommentare(readFileSync(datei, 'utf8'))
      for (const m of quelle.matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)) {
        if (!m[1].startsWith('./')) fremd.push(`${datei}: ${m[1]}`)
      }
    }
    expect(fremd).toEqual([])
  })

  it('nennt keinen Bezeichner, der dem Plan gehoert', () => {
    // Die Liste ist aufgezaehlt und nicht gemustert: ein Muster wie
    // /Equipment/ traefe auch harmlose eigene Namen, und ein Waechter, der
    // bei richtigem Code anschlaegt, wird abgeschaltet statt gelesen.
    const planBezeichner = ['EquipmentItem', 'CablePlannerProject', 'CostAnchor', 'SeedGeraet']
    const befunde: string[] = []
    for (const datei of dateien(WURZEL)) {
      const quelle = ohneKommentare(readFileSync(datei, 'utf8'))
      for (const name of planBezeichner) {
        if (new RegExp(`\\b${name}\\b`).test(quelle)) befunde.push(`${datei}: ${name}`)
      }
    }
    expect(befunde).toEqual([])
  })

  it('und traegt die Domaene wirklich', () => {
    // Die Gegenrichtung: ein Paket, das nichts mehr enthaelt, besteht die
    // beiden Tests darueber muehelos und sichert nichts zu.
    const namen = dateien(WURZEL).map((d) => d.split('/').pop())
    expect(namen).toContain('labour.ts')
    expect(namen).toContain('labourCost.ts')
    expect(namen).toContain('crewBilling.ts')
    expect(namen).toContain('crewCalendar.ts')
    expect(namen).toContain('receipt.ts')
  })
})

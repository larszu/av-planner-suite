// ───────────────────────────────────────────────────────────────────────────
// Die Kategorie ist die ZUORDNUNG — und darf deshalb nicht zweimal existieren.
//
// GEFUNDEN 2026-09-19 (ADR-012). Der Katalog fuehrte „Sync/Reference" UND
// „Sync/Referenz": zwei Katalogdateien des Cable-Planers schrieben die
// englische Fassung, eine dritte war beim Sprachwechsel (#822) uebersehen
// worden und schrieb weiter die deutsche.
//
// Solange die Kategorie nur eine Ueberschrift in der Bibliotheks-Seitenleiste
// war, war das haesslich. Seit ADR-011 ordnet sie ein Geraet den PLAENEN zu
// (`gewerkeFuer`) — zwei Schreibweisen sind dann zwei Zuordnungen, und die
// eine davon trifft keine Regel.
//
// Gemessen wird der Satz der Kategorien gegen sich selbst: zwei, die sich nur
// in der Sprache unterscheiden, sind dieselbe. Eine Liste erlaubter Namen
// waere die zweite Wahrheit (ADR-001) und driftete gegen die Kataloge.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { alleTypen } from '../src/katalog'

/**
 * Endungen, an denen sich dieselbe Kategorie in zwei Sprachen unterscheidet.
 *
 * Absichtlich klein gehalten: gemessen wird nicht „ist das Deutsch?", sondern
 * „stehen hier zwei Namen, die bis auf eine bekannte Endung gleich sind?".
 * Was der Wächter nicht kennt, meldet er nicht — und behauptet auch nicht,
 * es geprüft zu haben.
 */
const VARIANTEN: ReadonlyArray<readonly [string, string]> = [
  ['reference', 'referenz'],
  ['cameras', 'kameras'],
  ['lights', 'licht'],
  ['lenses', 'objektive'],
  ['converter', 'konverter'],
  ['networking', 'netzwerk'],
]

const vereinheitliche = (k: string): string => {
  let n = k.toLowerCase()
  for (const [en, de] of VARIANTEN) n = n.split(de).join(en)
  return n
}

describe('Kategorien — eine Sache, ein Name', () => {
  it('fuehrt keine Kategorie in zwei Sprachen', () => {
    const jeForm = new Map<string, Set<string>>()
    for (const t of alleTypen()) {
      const form = vereinheitliche(t.kategorie)
      if (!jeForm.has(form)) jeForm.set(form, new Set())
      jeForm.get(form)!.add(t.kategorie)
    }
    const doppelt = [...jeForm.values()].filter((s) => s.size > 1).map((s) => [...s].sort())
    expect(doppelt).toEqual([])
  })

  it('und jede Kategorie traegt wirklich Geraete', () => {
    // Eine leere Kategorie waere ein Name ohne Sache — der Anfang derselben
    // Sorte Drift von der anderen Seite.
    const leer = [...new Set(alleTypen().map((t) => t.kategorie))].filter(
      (k) => alleTypen().filter((t) => t.kategorie === k).length === 0,
    )
    expect(leer).toEqual([])
  })
})

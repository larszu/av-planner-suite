import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deckungsAmpel } from '@avplan/ui/embed'
import { ALL_WIDGETS, DEFAULT_CARD_ORDER, WIDGET_LABEL } from '../src/shell/dashboardPrefs'
import { PROJECT } from '../src/data/project'
import { suiteToSeed } from '../src/data/seed'

// ───────────────────────────────────────────────────────────────────────────
// B-78 / suite#260 — die Antwort des Lagers steht jetzt irgendwo.
//
// Sie kam seit 2026-09-18 an (`SuiteProject.deckung`) und stand im Seed fuer
// alle Planer bereit; gezeigt hat sie niemand. Dieser Test fragt die ganze
// Strecke ab: aus dem Projekt ueber den Seed zur Ampel, und von der Ampel in
// eine Karte, die die Uebersicht ab Werk rendert.
// ───────────────────────────────────────────────────────────────────────────

const SRC = join(import.meta.dirname, '..', 'src')
const lies = (p: string): string => readFileSync(join(SRC, p), 'utf8')

describe('Bedarf & Deckung in der Uebersicht', () => {
  it('ist als Widget registriert, beschriftet und ab Werk sichtbar — neben der Pack-Bereitschaft', () => {
    expect(ALL_WIDGETS).toContain('deckung')
    expect(WIDGET_LABEL.deckung).toBeTruthy()
    expect(DEFAULT_CARD_ORDER.indexOf('deckung')).toBe(DEFAULT_CARD_ORDER.indexOf('readiness') + 1)
  })

  it('wird von der Uebersicht wirklich gerendert und traegt eine Legende', () => {
    expect(lies('shell/OverviewSurface.tsx')).toContain('<DeckungCard')
    const karte = lies('shell/dashboard.tsx')
    expect(karte).toContain('deckungsAmpel(seed.bedarf, seed.deckung)')
    expect(karte).toContain("'overview.deckung.legend'")
  })
})

describe('vom Projekt zur Ampel', () => {
  it('ohne Antwort des Lagers ist JEDE Zeile unbekannt — nicht fehlend', () => {
    const seed = suiteToSeed(PROJECT, 0)
    const zeilen = deckungsAmpel(seed.bedarf, seed.deckung)
    expect(zeilen.length).toBeGreaterThan(0)
    expect(zeilen.every((z) => z.ampel === 'unbekannt' && z.unbekanntWeil === 'keine-antwort')).toBe(true)
  })

  it('die gemeldete Deckung faerbt genau die Zeilen, zu denen sie gehoert', () => {
    const ohne = suiteToSeed(PROJECT, 0)
    const fx9 = ohne.bedarf.find((b) => b.label === 'Sony FX9')!
    const venice = ohne.bedarf.find((b) => b.label === 'Sony VENICE 2')!
    const seed = suiteToSeed(
      {
        ...PROJECT,
        deckung: [
          { key: fx9.key, benoetigt: fx9.quantity, gedeckt: 1 },
          { key: venice.key, benoetigt: venice.quantity },
        ],
      },
      0,
    )
    const nach = new Map(deckungsAmpel(seed.bedarf, seed.deckung).map((z) => [z.bedarf.label, z]))
    expect(nach.get('Sony FX9')).toMatchObject({ ampel: 'subhire', gedeckt: 1, fehlmenge: 1 })
    expect(nach.get('Sony VENICE 2')).toMatchObject({ ampel: 'unbekannt', unbekanntWeil: 'nicht-gezaehlt' })
    expect(nach.get('KL Panel XL')).toMatchObject({ ampel: 'unbekannt', unbekanntWeil: 'keine-antwort' })
  })
})

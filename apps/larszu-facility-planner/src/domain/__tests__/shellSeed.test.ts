// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): was das Haus dem Plan meldet.
//
// Der Test hält die zwei Stellen fest, an denen NICHT gerechnet wird — beide
// sind die Regel „Die Tür rechnet nicht selbst" aus der CLAUDE.md dieses
// Repos, hier an der Aussenkante gemessen statt nur im Vertrag.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { anschluesseAusGebaeude } from '../../lib/shellSeed'
import type { Anschlusspunkt, Gebaeude, Raum } from '../modell'

const raum = (patch: Partial<Raum> & { id: string }): Raum => ({
  name: 'Raum',
  hausbezeichner: '',
  ...patch,
})

const punkt = (patch: Partial<Anschlusspunkt> & { id: string }): Anschlusspunkt => ({
  bezeichnung: 'Dose',
  art: 'dose',
  raumId: 'r1',
  anschlussart: 'cee32',
  netzform: 'TN-S',
  absicherungA: 32,
  charakteristik: 'C',
  rcdTyp: 'A',
  ...patch,
})

const haus = (patch: Partial<Gebaeude>): Gebaeude => ({
  id: 'g1',
  name: 'Haus',
  raeume: [],
  punkte: [],
  stromkreise: [],
  verteilungen: [],
  klinken: [],
  strecken: [],
  trassen: [],
  schaltstellen: [],
  ...patch,
} as Gebaeude)

describe('anschluesseAusGebaeude', () => {
  it('rechnet KEINE Dauerleistung aus dem Nennstrom', () => {
    // Die Kernregel. 32 A × 230 V wären 7360 W — eine Zahl, die im Plan wie
    // eine Auskunft des Hauses aussähe und keine ist.
    const a = anschluesseAusGebaeude(haus({ raeume: [raum({ id: 'r1' })], punkte: [punkt({ id: 'p1' })] }))

    expect(a[0]!.absicherungA).toBe(32)
    expect(a[0]!.dauerleistungW).toBeUndefined()
    expect('dauerleistungW' in a[0]!).toBe(false)
  })

  it('reicht eine ANGEGEBENE Dauerleistung durch', () => {
    const a = anschluesseAusGebaeude(
      haus({ raeume: [raum({ id: 'r1' })], punkte: [punkt({ id: 'p1', dauerleistungW: 5000 })] }),
    )
    expect(a[0]!.dauerleistungW).toBe(5000)
  })

  it('macht aus „nicht angegeben" kein „nein"', () => {
    const a = anschluesseAusGebaeude(haus({ raeume: [raum({ id: 'r1' })], punkte: [punkt({ id: 'p1' })] }))

    expect(a[0]!.geschaltet).toBeUndefined()
    expect('geschaltet' in a[0]!).toBe(false)
    expect('gedimmt' in a[0]!).toBe(false)
  })

  it('meldet eine angegebene Schaltung — auch die Verneinung', () => {
    const a = anschluesseAusGebaeude(
      haus({ raeume: [raum({ id: 'r1' })], punkte: [punkt({ id: 'p1', geschaltet: false, gedimmt: true })] }),
    )
    expect(a[0]!.geschaltet).toBe(false)
    expect(a[0]!.gedimmt).toBe(true)
  })

  it('schickt den HAUSBEZEICHNER des Raums, nicht unsere Id', () => {
    const a = anschluesseAusGebaeude(
      haus({ raeume: [raum({ id: 'r1', name: 'Große Halle', hausbezeichner: 'A.01' })], punkte: [punkt({ id: 'p1' })] }),
    )
    expect(a[0]!.raum).toBe('A.01')
  })

  it('nimmt den Namen, wenn das Haus keinen Bezeichner führt', () => {
    const a = anschluesseAusGebaeude(
      haus({ raeume: [raum({ id: 'r1', name: 'Große Halle', hausbezeichner: '  ' })], punkte: [punkt({ id: 'p1' })] }),
    )
    expect(a[0]!.raum).toBe('Große Halle')
  })

  it('lässt den Raum WEG statt eine Id wie einen Raumnamen aussehen zu lassen', () => {
    const a = anschluesseAusGebaeude(haus({ raeume: [], punkte: [punkt({ id: 'p1', raumId: 'weg' })] }))
    expect('raum' in a[0]!).toBe(false)
  })

  it('übersetzt Normbegriffe nicht, sondern schreibt sie aus', () => {
    const a = anschluesseAusGebaeude(
      haus({ raeume: [raum({ id: 'r1' })], punkte: [punkt({ id: 'p1', anschlussart: 'cee63' })] }),
    )
    expect(a[0]!.anschlussart).toBe('CEE 63')
  })
})

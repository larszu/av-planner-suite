// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): die Brücke Plan → Lager.
//
// Zwei Aussagen hält diese Datei fest, und beide sind Regeln und keine
// Implementierungsdetails:
//
//   1. „Nicht gezählt" ist nicht „null vorhanden". Eine Bedarfszeile ohne
//      Lagerposition bekommt KEINE Deckungszahl.
//   2. Ein Gerät ohne Modell wird nicht zur Lagerposition. Der Plan schickt
//      dort den Instanznamen, und daraus eine Position zu machen ist der
//      Fehler, den ADR-002 im eigenen Baum gefunden hat.
//
//   3. Die Deckung misst, was die Übernahme anlegen würde. `deckungAusBestand`
//      baut den Namensschlüssel des Stores nach (Suite-Überlagerung, der Store
//      liegt upstream) — weichen die beiden ab, zeigt das Lager eine Deckung
//      über eine Position, die `seedAusBedarf` gar nicht trifft.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import type { SeedBedarf } from '@avplan/ui/embed'
import { bedarfAusSeed, deckungAusBestand } from '../../lib/shellSeed'
import { useInventoryStore } from '../store/inventoryStore'
import type { InventoryItem } from '../types/inventory'

const artikel = (patch: Partial<InventoryItem> & { model: string; quantity: number }): InventoryItem => ({
  id: `it-${patch.model}-${patch.quantity}`,
  category: undefined,
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
  ...patch,
})

const zeile = (patch: Partial<SeedBedarf> & { key: string; label: string; quantity: number }): SeedBedarf => ({
  fromDomain: 'signal',
  ...patch,
})

describe('bedarfAusSeed', () => {
  it('reicht Modell-Zeilen als Vertragsform weiter', () => {
    const { zeilen, offen } = bedarfAusSeed({
      bedarf: [zeile({ key: 'fx9', label: 'Sony FX9', quantity: 3, category: 'camera', deviceTypeId: 'gu-1' })],
    })

    expect(offen).toEqual([])
    expect(zeilen).toEqual([
      { key: 'fx9', deviceTypeId: 'gu-1', label: 'Sony FX9', category: 'camera', quantity: 3 },
    ])
  })

  it('erfindet kein `muster` — Mietpreis und Lagerort gehören dem Lager', () => {
    const { zeilen } = bedarfAusSeed({ bedarf: [zeile({ key: 'a', label: 'A', quantity: 1 })] })
    expect(zeilen[0]!.muster).toBeUndefined()
  })

  it('legt aus einem Gerät OHNE Modell keine Position an (ADR-002)', () => {
    const { zeilen, offen } = bedarfAusSeed({
      bedarf: [
        zeile({ key: 'unbekannt:cameras:c1', label: 'Kamera 1', quantity: 1, modellUnbekannt: true }),
        zeile({ key: 'unbekannt:cameras:c2', label: 'Kamera 2', quantity: 1, modellUnbekannt: true }),
      ],
    })

    expect(zeilen).toEqual([])
    expect(offen.map((o) => o.label)).toEqual(['Kamera 1', 'Kamera 2'])
  })
})

describe('deckungAusBestand', () => {
  const bedarf = [
    zeile({ key: 'fx9', label: 'Sony FX9', quantity: 4, category: 'camera' }),
    zeile({ key: 'unbekannt', label: 'Kamera 1', quantity: 1, modellUnbekannt: true }),
  ]

  it('meldet die gezählte Menge', () => {
    const d = deckungAusBestand(bedarf, [artikel({ model: 'Sony FX9', category: 'camera', quantity: 2 })])
    expect(d[0]).toEqual({ key: 'fx9', benoetigt: 4, gedeckt: 2 })
  })

  it('lässt `gedeckt` WEG, wenn es zur Zeile keine Position gibt', () => {
    // Das ist die ganze Aussage dieses Tests: nicht `gedeckt: 0`. Niemand hat
    // gezählt, und eine 0 wäre eine Zählung.
    const d = deckungAusBestand(bedarf, [])
    expect(d[0]).toEqual({ key: 'fx9', benoetigt: 4 })
    expect('gedeckt' in d[0]!).toBe(false)
  })

  it('unterscheidet „nicht gezählt" von der gezählten Null', () => {
    const d = deckungAusBestand(bedarf, [artikel({ model: 'Sony FX9', category: 'camera', quantity: 0 })])
    expect(d[0]).toEqual({ key: 'fx9', benoetigt: 4, gedeckt: 0 })
  })

  it('gibt einer Zeile ohne Modell keine Deckung', () => {
    const d = deckungAusBestand(bedarf, [artikel({ model: 'Kamera 1', quantity: 5 })])
    expect(d[1]).toEqual({ key: 'unbekannt', benoetigt: 1 })
  })

  it('addiert mehrere Positionen desselben Modells', () => {
    const d = deckungAusBestand(bedarf, [
      artikel({ model: 'Sony FX9', category: 'camera', quantity: 2 }),
      artikel({ model: 'sony fx9', category: 'Camera', quantity: 1 }),
    ])
    expect(d[0]!.gedeckt).toBe(3)
  })

  it('trifft über die Katalog-Id, auch wenn der Modellname abweicht', () => {
    const mitId = [zeile({ key: 'k', label: 'FX9', quantity: 1, deviceTypeId: 'gu-1' })]
    const d = deckungAusBestand(mitId, [artikel({ model: 'Sony FX9 (Haus)', deviceTypeId: 'gu-1', quantity: 2 })])
    expect(d[0]!.gedeckt).toBe(2)
  })
})

describe('Deckung und Übernahme messen dasselbe', () => {
  it('was als gedeckt gilt, legt `seedAusBedarf` nicht neu an', () => {
    // Die Gegenprobe zur nachgebauten Schlüsselbildung. Weicht der Store ab,
    // zählt die Deckung eine Position, die die Übernahme nicht findet — und
    // der Lagerist sieht „vorhanden" und bekommt trotzdem eine Dublette.
    const vorhanden = artikel({ model: 'Sony FX9', category: 'camera', quantity: 2 })
    useInventoryStore.setState({ items: [vorhanden], nodes: [], sets: [], units: [] })

    const { zeilen } = bedarfAusSeed({
      bedarf: [zeile({ key: 'fx9', label: 'Sony FX9', quantity: 4, category: 'camera' })],
    })
    const d = deckungAusBestand(
      [zeile({ key: 'fx9', label: 'Sony FX9', quantity: 4, category: 'camera' })],
      [vorhanden],
    )

    expect(d[0]!.gedeckt).toBe(2)
    expect(useInventoryStore.getState().seedAusBedarf(zeilen)).toBe(0)
    // Menge angehoben, keine zweite Position.
    expect(useInventoryStore.getState().items).toHaveLength(1)
    expect(useInventoryStore.getState().items[0]!.quantity).toBe(4)
  })
})

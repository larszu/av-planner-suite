// ───────────────────────────────────────────────────────────────────────────
// EIN SELBST ANGELEGTES GERAET, IN EINEM ANDEREN PLANER GEOEFFNET (ADR-014).
//
// Eigentuemer, 2026-09-19: „Ich muss aber auch selber Geräte anlegen können
// und dann in anderen Planern öffnen können."
//
// Gemessen am selben Tag: ein von Hand im Signalplan angelegtes Geraet mit
// der Kategorie „Cameras" kam bis in den Seed — und wurde vom Kameraplan
// VERWORFEN. Der Grund stand in der Konsole („Modell nicht eindeutig"), der
// Nutzer sah in jenem Planer gar nichts. Sein Geraet war einfach nicht da.
//
// Was sich geaendert hat, ist NICHT, dass der Kameraplan jetzt raet. Ohne
// Sensorbreite gibt es keinen Bildwinkel, und eine gerechnete Zahl saehe
// voellig richtig aus (ADR-002). Geaendert hat sich, dass das Geraet
// SICHTBAR ist und sagt, was ihm fehlt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { emptySeed } from '@avplan/ui/embed'
import { cableToSeedPatch } from '../../cable-planner/src/renderer/lib/shellSeed'
import { seedToCameras } from '../../multicam-planner/src/utils/shellSeed'
import { seedToFixtures } from '../../light-planner/src/core/shellSeed'
import { LENSES } from '../../multicam-planner/src/data/lenses'
import type { EquipmentItem } from '../../cable-planner/src/renderer/types/equipment'
import type { Venue } from '../../multicam-planner/src/types'

const halle: Venue = { name: 'Halle', widthM: 24, heightM: 14, stages: [] }

/** Zwei Geraete, von Hand im Signalplan angelegt und zugeordnet. */
const vonHand = (): EquipmentItem[] =>
  [
    { id: 'e1', name: 'Werkstatt-Kamera', category: 'Cameras', x: 100, y: 100, width: 240, height: 200, inputs: [], outputs: [] },
    { id: 'e2', name: 'Werkstatt-Fluter', category: 'Lights', x: 200, y: 100, width: 240, height: 200, inputs: [], outputs: [] },
  ] as EquipmentItem[]

const seed = () => ({ ...emptySeed(1), geraete: cableToSeedPatch({ equipment: vonHand() }).geraete })

describe('Ein von Hand angelegtes Geraet geht nicht verloren', () => {
  it('kommt mit seiner Kategorie im geteilten Projekt an', () => {
    expect(seed().geraete.map((g) => `${g.name}/${g.kategorie}`)).toEqual([
      'Werkstatt-Kamera/Cameras',
      'Werkstatt-Fluter/Lights',
    ])
  })

  it('der Kameraplan MELDET es, statt es stillschweigend fallenzulassen', () => {
    const { cameras, ausgelassen } = seedToCameras(seed(), halle, () => ({ mount: 'E', lens: LENSES[0] }))
    // Platziert wird es nicht — ohne Modell gibt es keinen Sensor.
    expect(cameras).toEqual([])
    // Aber es steht in der Liste, die die Oberflaeche zeigt, mit Grund UND
    // dem Geraet: nur so kann ihm dort jemand ein Modell geben.
    expect(ausgelassen).toHaveLength(1)
    expect(ausgelassen[0].name).toBe('Werkstatt-Kamera')
    expect(ausgelassen[0].grund).toBe('kein Modell angegeben')
    expect(ausgelassen[0].geraet.id).toBe('e1')
  })

  it('der Lichtplan ebenso', () => {
    const { fixtures, ausgelassen } = seedToFixtures(seed(), 6)
    expect(fixtures).toEqual([])
    expect(ausgelassen).toHaveLength(1)
    expect(ausgelassen[0].name).toBe('Werkstatt-Fluter')
    expect(ausgelassen[0].grund).toBe('kein Modell angegeben')
    expect(ausgelassen[0].geraet.id).toBe('e2')
  })

  it('der Grund NENNT das Modell, wenn es eines gibt', () => {
    // Der andere Fall: ein Modell ist angegeben, nur kennt es dieser Planer
    // nicht. Das ist eine andere Auskunft als „gar kein Modell" — und wer
    // sie liest, weiss, ob er tippen oder suchen muss.
    const mitModell = cableToSeedPatch({
      equipment: [{ ...vonHand()[0], name: 'Werkstatt-Kamera' }] as EquipmentItem[],
    }).geraete.map((g) => ({ ...g, model: 'Haus Spezialkamera' }))
    const { ausgelassen } = seedToCameras(
      { ...emptySeed(1), geraete: mitModell }, halle, () => ({ mount: 'E', lens: LENSES[0] }),
    )
    expect(ausgelassen[0].grund).toContain('Haus Spezialkamera')
  })
})

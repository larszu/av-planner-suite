// #910 in der Suite — die Optik einer Kamera kommt mit dem Seed (Gruppe
// `kamera`) und steht am Geraet im Signalplan. Sie gehoert dem Kameraplan:
// sie reist nicht im Signal-Fach zurueck und folgt jeder Aenderung dort.
import { describe, expect, it } from 'vitest'
import { SUITE_SEED_KIND, SUITE_SEED_VERSION, type SeedGeraet, type SuiteSeed } from '@avplan/ui/embed'
import { optikAusSeed, seedToCable } from '../src/renderer/lib/shellSeed'
import { fachAus } from '../src/renderer/lib/fachdaten'

const seed = (geraete: SeedGeraet[]): SuiteSeed =>
  ({
    kind: SUITE_SEED_KIND,
    formatVersion: SUITE_SEED_VERSION,
    revision: 1,
    venue: { name: 'Halle A' },
    geraete,
    cables: [],
    bedarf: [],
    deckung: [],
    anschluesse: [],
  }) as SuiteSeed

const cam = (kamera?: SeedGeraet['kamera']): SeedGeraet => ({
  id: 'cam2', name: 'CAM 2', kategorie: 'Cameras', model: 'Sony FX9', nx: 0.1, ny: 0.2, ...(kamera ? { kamera } : {}),
})

describe('optikAusSeed', () => {
  it('uebernimmt nur, was der Kameraplan nennt', () => {
    expect(optikAusSeed({ lens: 'FE 24–105 f/4', focalMm: 85, hfovDeg: 12.4 })).toEqual({
      objektivModell: 'FE 24–105 f/4',
      brennweiteMm: 85,
      bildwinkelGrad: 12.4,
    })
    expect(optikAusSeed({ lens: '  ' })).toBeUndefined()
    expect(optikAusSeed(undefined)).toBeUndefined()
  })
})

describe('seedToCable traegt die Optik', () => {
  it('eine neue Kamera bekommt sie', () => {
    const { equipment } = seedToCable(seed([cam({ lens: 'UA24x7.8', focalMm: 50 })]))
    expect(equipment[0].optik).toEqual({ objektivModell: 'UA24x7.8', brennweiteMm: 50 })
  })

  it('ein Objektivwechsel im Kameraplan kommt am vorhandenen Geraet an; ein entferntes verschwindet', () => {
    const erst = seedToCable(seed([cam({ lens: 'UA24x7.8', focalMm: 50 })])).equipment
    const dann = seedToCable(seed([cam({ lens: 'UA46x9.5', focalMm: 120 })]), erst).equipment
    expect(dann[0].optik).toEqual({ objektivModell: 'UA46x9.5', brennweiteMm: 120 })
    const ohne = seedToCable(seed([cam()]), dann).equipment
    expect(ohne[0].optik).toBeUndefined()
  })

  it('die Optik reist nicht im Signal-Fach zurueck', () => {
    const [e] = seedToCable(seed([cam({ lens: 'UA24x7.8' })])).equipment
    expect(Object.keys(fachAus(e))).not.toContain('optik')
  })
})

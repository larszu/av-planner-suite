// ───────────────────────────────────────────────────────────────────────────
// DIE GEMEINSAME BASIS, durchgehend gemessen (ADR-012).
//
// Der Eigentuemer, 2026-09-19: „Inventory planner und der ganze Rest hat aber
// noch eigene Listen. Ausnahmslos alles soll sich die gleiche Basis teilen!"
//
// ADR-011 hat aus drei GERAETElisten eine gemacht. Was blieb, war eine Ebene
// tiefer: der TYP eines Geraets stand als freier Text in `model`, und jeder
// Planer loeste ihn gegen seine eigene Liste auf — der Kameraplan gegen
// `data/cameras.ts`, der Lichtplan gegen `fixtureLibrary`, das Lager gegen
// den kleingeschriebenen Modellnamen.
//
// Diese Datei geht den Weg, den ein Geraet wirklich nimmt: im Cable-Planer
// angelegt, ueber den Seed in die Shell, von dort in den Kameraplan und ins
// Lager — und prueft, dass an jeder Station DIESELBE Id ankommt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { deriveBedarf } from '@avplan/ui/embed'
import { cableToSeedPatch } from '../../cable-planner/src/renderer/lib/shellSeed'
import { katalogKamera } from '../../multicam-planner/src/utils/shellSeed'
import type { EquipmentItem } from '../../cable-planner/src/renderer/types/equipment'

/** Die Sony PXW-FX9 — im Cable-Katalog UND in der Kameraliste gefuehrt. */
const FX9 = '05d88e97-2f3d-4b16-868c-f13f202754c5'

const imCablePlaner = (over: Partial<EquipmentItem> = {}): EquipmentItem =>
  ({
    id: 'e1',
    name: 'Kamera 1',
    deviceTypeId: FX9,
    x: 100,
    y: 200,
    ports: [],
    ...over,
  }) as EquipmentItem

describe('Eine Kamera im Cable-Planer, angekommen im Kameraplan', () => {
  it('der Rueckweg traegt die Katalog-Identitaet', () => {
    const { geraete } = cableToSeedPatch({ equipment: [imCablePlaner()] })
    expect(geraete[0].typId).toBe(FX9)
    // Und die Kategorie, die das Geraet dem Kameraplan zuordnet (ADR-011).
    expect(geraete[0].kategorie).toBe('Cameras')
  })

  it('und der Kameraplan findet sie darueber — nicht ueber den Namen', () => {
    // „Kamera 1" ist der INSTANZname. Er trifft kein Modell, und genau das
    // ist der Punkt: der Weg haengt nicht mehr daran, wie jemand das Geraet
    // im Signalplan beschriftet hat.
    const { geraete } = cableToSeedPatch({ equipment: [imCablePlaner({ name: 'Kamera 1' })] })
    expect(katalogKamera({ ...geraete[0], model: 'Kamera 1' })?.id).toBe('sony-fx9')
  })

  it('das Lager bekommt dieselbe Id als Schluessel', () => {
    const { geraete } = cableToSeedPatch({
      equipment: [imCablePlaner(), imCablePlaner({ id: 'e2', name: 'Kamera 2' })],
    })
    const bedarf = deriveBedarf({ geraete })
    // EINE Zeile, Menge 2 — und der Schluessel ist die Katalog-Id, ueber die
    // `deckungAusBestand` im Lager die Position findet (`deviceTypeId`).
    expect(bedarf).toHaveLength(1)
    expect(bedarf[0].quantity).toBe(2)
    expect(bedarf[0].key).toBe(FX9)
    expect(bedarf[0].deviceTypeId).toBe(FX9)
  })

  it('ein Geraet ohne Katalog-Herkunft traegt keine Id — und behauptet keine', () => {
    const { geraete } = cableToSeedPatch({
      equipment: [imCablePlaner({ deviceTypeId: undefined, name: 'Eigenbau' })],
    })
    expect(geraete[0].typId).toBeUndefined()
    expect(deriveBedarf({ geraete })[0].deviceTypeId).toBeUndefined()
  })
})

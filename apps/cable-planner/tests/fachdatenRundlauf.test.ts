// ───────────────────────────────────────────────────────────────────────────
// A NACH B NACH C UND WIEDER NACH A — die Signal-Seite (ADR-013).
//
// Ohne `vorhandene`: das Projekt kommt aus der Datei, dieser Planer lief
// seither nicht. Genau dort ging bis heute jede Arbeit an den ANSCHLUESSEN
// verloren — ein umbenannter Port, ein zusaetzlich angelegter, eine gedrehte
// Seite. Solange jedes Geraet sauber aus dem Katalog kam, fiel es nicht auf:
// `seedToCable` baut die Ports beim Lesen aus dem Datenblatt neu. Fuer ein
// Geraet OHNE Datenblatt gab es danach gar nichts mehr.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { SUITE_SEED_KIND, SUITE_SEED_VERSION, type SeedGeraet, type SuiteSeed } from '@avplan/ui/embed'
import { cableToSeedPatch, seedToCable } from '../src/renderer/lib/shellSeed'
import type { EquipmentItem } from '../src/renderer/types/equipment'

const seedMit = (geraete: SeedGeraet[]): SuiteSeed => ({
  kind: SUITE_SEED_KIND,
  formatVersion: SUITE_SEED_VERSION,
  revision: 1,
  projectName: 'Rundlauf',
  venue: { name: 'Halle' },
  geraete,
  cables: [],
  bedarf: [],
  deckung: [],
  anschluesse: [],
})

describe('Die Anschluesse ueberleben den Umweg', () => {
  it('haelt umbenannte und selbst angelegte Ports ueber Seed und Datei', () => {
    // Ein Geraet, das der Katalog nicht kennt — der Nutzer hat seine
    // Anschluesse selbst eingetragen.
    const eigenbau: EquipmentItem = {
      id: 'e1',
      name: 'Patchfeld Regie',
      category: 'Other',
      x: 240,
      y: 400,
      width: 240,
      height: 200,
      inputs: [{ id: 'p1', name: 'Bühne 1', type: 'BNC' }],
      outputs: [{ id: 'p2', name: 'Regie A', type: 'BNC' }],
      portsUnknown: true,
    } as EquipmentItem

    const gemeldet = cableToSeedPatch({ equipment: [eigenbau] }).geraete
    expect(gemeldet[0].fachdaten?.signal).toMatchObject({ portsUnknown: true })

    // Umweg und zurueck, ohne lokalen Stand.
    const { equipment } = seedToCable(seedMit(gemeldet))
    expect(equipment[0].inputs).toEqual([{ id: 'p1', name: 'Bühne 1', type: 'BNC' }])
    expect(equipment[0].outputs).toEqual([{ id: 'p2', name: 'Regie A', type: 'BNC' }])
    expect(equipment[0].portsUnknown).toBe(true)
  })

  it('haelt Rack-Einbau und Fremdschluessel', () => {
    const imRack: EquipmentItem = {
      id: 'e2',
      name: 'Videohub',
      category: 'Video Router',
      x: 0,
      y: 0,
      width: 240,
      height: 200,
      inputs: [],
      outputs: [],
      isRackDevice: true,
      rackUnits: 2,
      rackInstanceLabel: 'Rack B',
      rentmanId: 'RM-4711',
      netboxPath: '/dcim/devices/12',
    } as EquipmentItem

    const gemeldet = cableToSeedPatch({ equipment: [imRack] }).geraete
    const { equipment } = seedToCable(seedMit(gemeldet))
    expect(equipment[0].isRackDevice).toBe(true)
    expect(equipment[0].rackUnits).toBe(2)
    expect(equipment[0].rackInstanceLabel).toBe('Rack B')
    expect(equipment[0].rentmanId).toBe('RM-4711')
    expect(equipment[0].netboxPath).toBe('/dcim/devices/12')
  })

  it('die Lage kommt aus dem PROTOKOLL und nicht aus dem Fach', () => {
    // `x`/`y` sind hier Bildpunkte, das Protokoll traegt `nx`/`ny` (0..1).
    // Dieselbe Angabe in zwei Einheiten an zwei Stellen waere die zweite
    // Wahrheit — und beim naechsten Umbau widersprechen sie sich.
    const e = { id: 'e3', name: 'X', category: 'Other', x: 300, y: 500, width: 240, height: 200, inputs: [], outputs: [] } as EquipmentItem
    const fach = cableToSeedPatch({ equipment: [e] }).geraete[0].fachdaten!.signal
    for (const geteilt of ['id', 'name', 'subtitle', 'category', 'deviceTypeId', 'x', 'y']) {
      expect(fach, `„${geteilt}" fuehrt das Protokoll — es gehoert nicht ins Fach`).not.toHaveProperty(geteilt)
    }
  })

  it('ein Geraet aus einem ANDEREN Planer bekommt seine Ports weiter aus dem Katalog', () => {
    // Es hat hier noch kein Fach. Die Regel dafuer ist unveraendert — sonst
    // stuende eine Kamera aus dem Kameraplan ohne Anschluesse im Signalweg.
    const { equipment } = seedToCable(
      seedMit([{ id: 'k1', name: 'CAM 1', kategorie: 'Cameras', model: 'Blackmagic ATEM Mini' }]),
    )
    expect(equipment).toHaveLength(1)
    expect(equipment[0].inputs.length + equipment[0].outputs.length).toBeGreaterThan(0)
  })
})

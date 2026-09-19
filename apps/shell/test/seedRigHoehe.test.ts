import { describe, expect, it } from 'vitest'
import { seedToFixtures, fixturesToSeedPatch } from '../../light-planner/src/core/shellSeed'
import { emptySeed, imLichtplan, type SeedGeraet, type SuiteSeed } from '@avplan/ui/embed'
import type { PlacedFixture } from '../../light-planner/src/types'
import { PROJECT, lichtGeraete } from '../src/data/project'
import { applyPatchToSuite, suiteToSeed } from '../src/data/seed'

/**
 * DER SEED SETZT NICHT ZURUECK, WAS ER NICHT SAGT.
 *
 * Der Befund, gegen den das hier steht — gemessen 2026-09-09 am gebauten
 * Stand: `connectShellSeed` wendet JEDE hoehere Revision an, und die Shell
 * zaehlt sie bei Projektwechsel, Undo/Redo und Kopf-Aenderung hoch.
 * `seedToFixtures` baute dabei jeden Scheinwerfer neu — Haenge-Hoehe aus der
 * Voreinstellung, Ausrichtung auf die eigene Stelle.
 *
 * Wer zwanzig Lampen auf die Buehne gerichtet und auf 8 m gehaengt hatte,
 * verlor beides, sobald jemand in der Shell den Projektnamen aenderte. Ohne
 * Meldung, ohne Undo in dieser App — die Lampen zeigten wieder auf ihre
 * eigenen Fuesse.
 */

const VORGABE = 6

/**
 * Eine Lampe in der bequemen Schreibweise des Lichtplans. Seit ADR-011
 * Stufe 4 gibt es die Liste `fixtures` im Seed nicht mehr — sie ist ein
 * FILTER auf die eine Geraeteliste. Der Helfer unten baut daraus Geraete.
 */
type AlsLeuchte = {
  id: string; name: string; model?: string
  x?: number; y?: number
  purpose?: string; dimmerPct?: number; dmxChannel?: number; rigHeightM?: number
}

const lampe = (id: string, model: string): AlsLeuchte => ({ id, name: id, model })

const seed = (fixtures: AlsLeuchte[]): SuiteSeed => {
  const geraete: SeedGeraet[] = fixtures.map((f) => ({
    id: f.id,
    name: f.name,
    kategorie: 'Licht',
    ...(f.model !== undefined ? { model: f.model } : {}),
    ...(f.x !== undefined ? { x: f.x } : {}),
    ...(f.y !== undefined ? { y: f.y } : {}),
    licht: {
      ...(f.purpose !== undefined ? { purpose: f.purpose } : {}),
      ...(f.dimmerPct !== undefined ? { dimmerPct: f.dimmerPct } : {}),
      ...(f.dmxChannel !== undefined ? { dmxChannel: f.dmxChannel } : {}),
      ...(f.rigHeightM !== undefined ? { rigHeightM: f.rigHeightM } : {}),
    },
  }))
  return { ...emptySeed(1), geraete }
}

/** Ein Modell, das der Katalog eindeutig kennt — sonst wird nichts platziert. */
const MODELL = 'ETC Source Four 26°'

const platziert = (teil: Partial<PlacedFixture>): PlacedFixture => {
  const basis = seedToFixtures(seed([lampe('lx1', MODELL)]), VORGABE).fixtures[0]
  expect(basis).toBeTruthy()
  return { ...basis, ...teil }
}

describe('Der Katalog-Treffer steht (Vorbedingung dieser Datei)', () => {
  it('platziert die Lampe ueberhaupt', () => {
    const { fixtures, ausgelassen } = seedToFixtures(seed([lampe('lx1', MODELL)]), VORGABE)
    expect(ausgelassen).toEqual([])
    expect(fixtures).toHaveLength(1)
  })
})

describe('Ein erneuter Seed nimmt nichts weg', () => {
  it('behaelt die Haenge-Hoehe, die hier gesetzt wurde', () => {
    const vorher = [platziert({ mountingHeight: 8 })]
    const { fixtures } = seedToFixtures(seed([lampe('lx1', MODELL)]), VORGABE, [], vorher)
    expect(fixtures[0].mountingHeight).toBe(8)
  })

  it('behaelt die Ausrichtung', () => {
    const vorher = [platziert({ aimX: 12, aimY: 3 })]
    const { fixtures } = seedToFixtures(seed([lampe('lx1', MODELL)]), VORGABE, [], vorher)
    expect(fixtures[0].aimX).toBe(12)
    expect(fixtures[0].aimY).toBe(3)
  })

  it('behaelt die Koerperdrehung', () => {
    const vorher = [platziert({ bodyRotation: 90 })]
    const { fixtures } = seedToFixtures(seed([lampe('lx1', MODELL)]), VORGABE, [], vorher)
    expect(fixtures[0].bodyRotation).toBe(90)
  })
})

describe('Was der Seed SAGT, gilt trotzdem', () => {
  it('eine genannte Hoehe schlaegt die vorhandene', () => {
    const vorher = [platziert({ mountingHeight: 8 })]
    const { fixtures } = seedToFixtures(
      seed([{ ...lampe('lx1', MODELL), rigHeightM: 4.5 }]),
      VORGABE,
      [],
      vorher,
    )
    expect(fixtures[0].mountingHeight).toBe(4.5)
  })

  it('eine genannte Position schlaegt die vorhandene', () => {
    const vorher = [platziert({ x: 1, y: 1 })]
    const { fixtures } = seedToFixtures(
      seed([{ ...lampe('lx1', MODELL), x: 9, y: 4 }]),
      VORGABE,
      [],
      vorher,
    )
    expect(fixtures[0].x).toBe(9)
    expect(fixtures[0].y).toBe(4)
  })
})

describe('Ein wirklich neuer Scheinwerfer bekommt die Voreinstellung', () => {
  it('nimmt die Haengehoehe des Planers und zielt auf sich selbst', () => {
    const { fixtures } = seedToFixtures(
      seed([{ ...lampe('neu', MODELL), x: 5, y: 5 }]),
      VORGABE,
      [],
      [platziert({ id: 'andere' })],
    )
    expect(fixtures[0].mountingHeight).toBe(VORGABE)
    expect(fixtures[0].aimX).toBe(5)
    expect(fixtures[0].aimY).toBe(5)
  })
})

describe('Ein nie ausgerichtetes Ziel wandert mit', () => {
  it('folgt der verschobenen Lampe, statt auf die alte Stelle zu zeigen', () => {
    // Die Lampe zielte auf sich selbst — das ist die Voreinstellung und keine
    // Absicht. Bliebe das Ziel liegen, saehe es nach dem Verschieben aus wie
    // eine Ausrichtung, die jemand vorgenommen hat.
    const vorher = [platziert({ x: 2, y: 2, aimX: 2, aimY: 2 })]
    const { fixtures } = seedToFixtures(
      seed([{ ...lampe('lx1', MODELL), x: 7, y: 8 }]),
      VORGABE,
      [],
      vorher,
    )
    expect(fixtures[0].aimX).toBe(7)
    expect(fixtures[0].aimY).toBe(8)
  })

  it('ein ECHT gesetztes Ziel bleibt liegen, wenn die Lampe wandert', () => {
    const vorher = [platziert({ x: 2, y: 2, aimX: 12, aimY: 3 })]
    const { fixtures } = seedToFixtures(
      seed([{ ...lampe('lx1', MODELL), x: 7, y: 8 }]),
      VORGABE,
      [],
      vorher,
    )
    expect(fixtures[0].aimX).toBe(12)
    expect(fixtures[0].aimY).toBe(3)
  })
})

describe('Die Hoehe geht in die Suite zurueck', () => {
  it('steht im Rueckweg-Patch', () => {
    // Ohne sie faende die Stueckliste die Kabel zum Scheinwerfer zu kurz.
    // Seit Stufe 3 meldet der Licht-Planer `geraete`, und die Hoehe steht in
    // der Fachgruppe `licht` — dort, wo die Shell sie als Eigentum des
    // Lichtplans erkennt und nichts anderes damit ueberschreibt.
    const patch = fixturesToSeedPatch([platziert({ mountingHeight: 8 })])
    expect(patch.geraete[0].licht?.rigHeightM).toBe(8)
  })
})

describe('Die Shell fuehrt die Hoehe mit, ohne sie zu planen', () => {
  const projekt = { ...PROJECT, geraete: PROJECT.geraete.map((g) => ({ ...g })) }
  const ersteLeuchte = lichtGeraete(projekt)[0]
  const alsSeedLeuchte = (rigHeightM?: number): SeedGeraet => ({
    id: ersteLeuchte.id,
    name: ersteLeuchte.name,
    licht: { ...(rigHeightM !== undefined ? { rigHeightM } : {}) },
  })
  const hoeheVon = (p: typeof projekt) =>
    p.geraete.find((g) => g.id === ersteLeuchte.id)?.licht?.rigHeightM

  it('erfindet keine, wo keine gemeldet ist', () => {
    // Ein `rigHeightM: 0` im Seed hiesse „haengt am Boden" und ueberschriebe
    // drueben die Hoehe, die der Planer selbst fuehrt.
    const s = suiteToSeed(projekt, 1)
    expect(imLichtplan(s.geraete).every((g) => g.licht?.rigHeightM === undefined)).toBe(true)
  })

  it('nimmt die gemeldete Hoehe auf und schickt sie wieder mit', () => {
    const { project: nachher } = applyPatchToSuite(projekt, {
      domain: 'fixtures',
      revision: 1,
      geraete: [alsSeedLeuchte(7.5)],
    }, 1)
    expect(hoeheVon(nachher)).toBe(7.5)
    expect(imLichtplan(suiteToSeed(nachher, 2).geraete)[0].licht?.rigHeightM).toBe(7.5)
  })

  it('verliert sie nicht, wenn ein spaeterer Patch sie nicht nennt', () => {
    // Der Cable-Planer meldet Geraete und kennt keine Rigging-Hoehe. Sein
    // Patch darf sie nicht mitnehmen — „nicht genannt" ist keine Loeschung.
    const { project: mitHoehe } = applyPatchToSuite(projekt, {
      domain: 'fixtures',
      revision: 1,
      geraete: [alsSeedLeuchte(7.5)],
    }, 1)
    // Die zweite Meldung nennt dieselbe Leuchte OHNE Hoehe.
    const { project: danach } = applyPatchToSuite(mitHoehe, {
      domain: 'fixtures',
      revision: 2,
      geraete: [alsSeedLeuchte()],
    }, 2)
    expect(hoeheVon(danach)).toBe(7.5)
  })
})

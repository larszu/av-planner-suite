// ───────────────────────────────────────────────────────────────────────────
// A NACH B NACH C UND WIEDER NACH A — der ganze Weg (ADR-013).
//
// Eigentuemer, 2026-09-19: „Sie muessen aber in allen Planern bleiben. Damit
// ich sie von a nach b nach c und wieder nach a kopieren kann und nichts
// verloren geht."
//
// Diese Datei geht genau diesen Satz: EIN Geraet, nacheinander durch
// Signalplan, Kameraplan und Lichtplan, jedes Mal ueber die Shell und ueber
// die Datei — und am Ende muss jede der drei Arbeiten noch da sein.
//
// WAS SIE ABSICHERT, DAS DIE EINZELNEN BRUECKEN-TESTS NICHT KOENNEN: dort
// prueft jeder Planer seinen eigenen Rundlauf. Hier fassen DREI dasselbe
// Geraet an. Der Schaden, gegen den das steht, entsteht nicht im Planer,
// sondern dazwischen: wer sein Fach schreibt, darf die beiden anderen nicht
// mitnehmen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { emptySeed } from '@avplan/ui/embed'
import { applyPatchToSuite, suiteToSeed } from '../src/data/seed'
import { PROJECT, type SuiteProject } from '../src/data/project'
import { parseProject, serializeProject } from '../src/data/projectFile'
import { cableToSeedPatch, seedToCable } from '../../cable-planner/src/renderer/lib/shellSeed'
import { camerasToSeedPatch, seedToCameras } from '../../multicam-planner/src/utils/shellSeed'
import { fixturesToSeedPatch, seedToFixtures } from '../../light-planner/src/core/shellSeed'
import { LENSES } from '../../multicam-planner/src/data/lenses'
import type { Venue } from '../../multicam-planner/src/types'

const halle: Venue = { name: 'Halle', widthM: 24, heightM: 14, stages: [] }
const vorauswahl = () => ({ mount: 'E', lens: LENSES[0] })

/** Ein Projekt mit genau einer Kamera — sie steht in allen drei Plaenen. */
const start = (): SuiteProject => ({
  ...PROJECT,
  geraete: [{
    id: 'k1',
    name: 'CAM 1',
    kategorie: 'Cameras',
    model: 'Sony PXW-FX9',
    typId: '05d88e97-2f3d-4b16-868c-f13f202754c5',
    group: 'floor',
    venue: true,
    x: 4,
    y: 10,
    nx: 0.2,
    ny: 0.3,
  }],
  cables: [],
})

/** Eine Meldung eines Planers in die Shell einarbeiten. */
const melde = (
  p: SuiteProject,
  domain: 'signal' | 'cameras' | 'fixtures',
  geraete: ReturnType<typeof cableToSeedPatch>['geraete'],
): SuiteProject => applyPatchToSuite(p, { domain, revision: 0, geraete }, 0).project

/** Speichern und wieder oeffnen — der Weg, auf dem es bisher verlorenging. */
const durchDieDatei = (p: SuiteProject): SuiteProject =>
  parseProject(serializeProject(p))

describe('Ein Geraet, drei Planer, kein Verlust', () => {
  it('haelt die Arbeit aller drei — auch ueber Speichern und Oeffnen', () => {
    let projekt = start()

    // ── A: der Signalplan. Jemand benennt einen Port um. ──────────────────
    const ausA = seedToCable(suiteToSeed(projekt, 0))
    const mitPort = ausA.equipment.map((e) => ({
      ...e,
      inputs: [{ id: 'sdi-1', name: 'Kamerazug links', type: 'BNC' as const }],
    }))
    projekt = melde(projekt, 'signal', cableToSeedPatch({ equipment: mitPort }).geraete)
    projekt = durchDieDatei(projekt)

    // ── B: der Kameraplan. Jemand richtet die Kamera aus. ─────────────────
    const ausB = seedToCameras(suiteToSeed(projekt, 0), halle, vorauswahl)
    expect(ausB.cameras, 'die Kamera muss im Kameraplan ankommen').toHaveLength(1)
    const gerichtet = [{ ...ausB.cameras[0], pan: 15, tilt: -8, z: 2.4, color: '#ff00ff' }]
    projekt = melde(projekt, 'cameras', camerasToSeedPatch(gerichtet).geraete)
    projekt = durchDieDatei(projekt)

    // ── C: der Lichtplan. Er sieht dieses Geraet nicht (es ist eine
    //      Kamera) — aber er meldet SEINE Leuchten, und dabei darf er die
    //      Faecher der anderen nicht abraeumen. ────────────────────────────
    const ausC = seedToFixtures(suiteToSeed(projekt, 0), 6)
    projekt = melde(projekt, 'fixtures', fixturesToSeedPatch(ausC.fixtures).geraete)
    projekt = durchDieDatei(projekt)

    // ── Zurueck bei A ─────────────────────────────────────────────────────
    const wiederA = seedToCable(suiteToSeed(projekt, 0))
    expect(wiederA.equipment[0].inputs).toEqual([
      { id: 'sdi-1', name: 'Kamerazug links', type: 'BNC' },
    ])

    // ── Und bei B ─────────────────────────────────────────────────────────
    const wiederB = seedToCameras(suiteToSeed(projekt, 0), halle, vorauswahl)
    expect(wiederB.cameras[0].pan).toBe(15)
    expect(wiederB.cameras[0].tilt).toBe(-8)
    expect(wiederB.cameras[0].z).toBe(2.4)
    expect(wiederB.cameras[0].color).toBe('#ff00ff')

    // Und die geteilten Angaben stehen genau einmal und unveraendert da.
    const g = projekt.geraete[0]
    expect(g.typId).toBe('05d88e97-2f3d-4b16-868c-f13f202754c5')
    expect(g.kategorie).toBe('Cameras')
    expect(Object.keys(g.fachdaten ?? {}).sort()).toEqual(['cameras', 'signal'])
  })

  it('ein leerer Seed nimmt kein Fach mit', () => {
    // Der Fall, den `connectShellSeed` abwehrt, hier eine Ebene tiefer: eine
    // Meldung, die das Geraet gar nicht nennt, aendert sein Fach nicht.
    let projekt = start()
    const ausB = seedToCameras(suiteToSeed(projekt, 0), halle, vorauswahl)
    projekt = melde(projekt, 'cameras', camerasToSeedPatch([{ ...ausB.cameras[0], pan: 42 }]).geraete)

    const vorher = projekt.geraete[0].fachdaten
    const nachher = applyPatchToSuite(projekt, { domain: 'signal', revision: 0 }, 0).project
    expect(nachher.geraete[0].fachdaten).toEqual(vorher)
    expect(emptySeed(0).geraete).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Die Typaussage überlebt den Rundlauf — und die Position wird nicht erfunden.
//
// Beides hängt an derselben Stelle: `applyPatchToSuite` baut die Knoten Feld
// für Feld neu auf. Genau daran ging `represents` bis zum 2026-09-18
// verloren, still und mit derselben Folge (B-18). `kategorie` und `model`
// sind dieselbe Art Feld — eine Aussage, die der Seed trägt und aus der die
// Shell die Zuordnung zu den Plänen RECHNET (ADR-011) —, also gehören sie
// unter denselben Wächter.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { applyPatchToSuite, suiteToSeed } from '../src/data/seed'
import { PROJECT } from '../src/data/project'
import type { SuiteProject } from '../src/data/project'

const basis: SuiteProject = {
  ...PROJECT,
  cameras: [],
  nodes: [
    { id: 'n1', name: 'CAM 1', sub: '3x SDI Out', group: 'floor', venue: true, nx: 0.1, ny: 0.2 },
  ],
  cables: [],
}

const melde = (p: SuiteProject, devices: Parameters<typeof applyPatchToSuite>[1]['devices']) =>
  applyPatchToSuite(p, { domain: 'signal', revision: 0, devices }, 0).project

describe('Kategorie und Modell im Rückweg', () => {
  it('der Signal-Planer darf sie setzen', () => {
    const next = melde(basis, [
      { id: 'n1', name: 'CAM 1', subtitle: '3x SDI Out', kategorie: 'Cameras', model: 'Sony FX9', nx: 0.1, ny: 0.2 },
    ])
    expect(next.nodes[0].kategorie).toBe('Cameras')
    expect(next.nodes[0].model).toBe('Sony FX9')
  })

  it('sie geht nicht verloren, wenn eine Meldung sie nicht mitschickt', () => {
    // Genau der Fall, an dem `represents` scheiterte: eine spätere Meldung
    // ohne das Feld baute den Knoten neu — und das Feld war weg.
    const mit = melde(basis, [
      { id: 'n1', name: 'CAM 1', kategorie: 'Cameras', model: 'Sony FX9', nx: 0.1, ny: 0.2 },
    ])
    const ohne = applyPatchToSuite(
      mit,
      { domain: 'signal', revision: 0, devices: [{ id: 'n1', name: 'CAM 1 neu', nx: 0.3, ny: 0.4 }] },
      0,
    ).project
    expect(ohne.nodes[0].name).toBe('CAM 1 neu')
    expect(ohne.nodes[0].kategorie).toBe('Cameras')
    expect(ohne.nodes[0].model).toBe('Sony FX9')
  })

  it('und sie fährt zu den Planern zurück', () => {
    const mit = melde(basis, [
      { id: 'n1', name: 'CAM 1', kategorie: 'Cameras', model: 'Sony FX9', nx: 0.1, ny: 0.2 },
    ])
    const seed = suiteToSeed(mit, 1)
    expect(seed.devices[0].kategorie).toBe('Cameras')
    expect(seed.devices[0].model).toBe('Sony FX9')
  })

  it('eine Kamera ohne Position bleibt ohne Position', () => {
    // Bis 2026-09-19 stand hier `?? 0` — die Kamera landete in der Ecke der
    // Halle, und die Vorschau zeichnete sie dort als Tatsache.
    const next = applyPatchToSuite(
      basis,
      {
        domain: 'cameras',
        revision: 0,
        cameras: [{ id: 'cam_n1', name: 'CAM 1', model: 'Sony FX9' }],
      },
      0,
    ).project
    expect(next.cameras[0].x).toBeUndefined()
    expect(next.cameras[0].y).toBeUndefined()

    // Nennt der Kameraplan eine, gilt sie — und sie bleibt beim nächsten Mal
    // stehen, auch wenn er sie nicht wiederholt.
    const platziert = applyPatchToSuite(
      next,
      { domain: 'cameras', revision: 0, cameras: [{ id: 'cam_n1', name: 'CAM 1', x: 4.2, y: 10.8 }] },
      0,
    ).project
    expect(platziert.cameras[0].x).toBe(4.2)
    const spaeter = applyPatchToSuite(
      platziert,
      { domain: 'cameras', revision: 0, cameras: [{ id: 'cam_n1', name: 'CAM 1' }] },
      0,
    ).project
    expect(spaeter.cameras[0].x).toBe(4.2)
    expect(spaeter.cameras[0].y).toBe(10.8)
  })
})

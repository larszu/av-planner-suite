// ───────────────────────────────────────────────────────────────────────────
// VERLUSTFREI DURCH ALLE PLANER (ADR-013).
//
// Eigentuemer, 2026-09-19: „Sie muessen aber in allen Planern bleiben. Damit
// ich sie von a nach b nach c und wieder nach a kopieren kann und nichts
// verloren geht."
//
// Der Schaden, gegen den das steht, ist gemessen: eine im Kameraplan
// ausgerichtete Kamera kam aus dem Rueckweg mit drei Feldern zurueck —
// Objektiv, Brennweite, Bildwinkel. Schwenk, Neigung, Hoehe, Blende, Fokus
// und Farbe fielen heraus. Im Betrieb fiel es nicht auf, weil der Planer
// seinen eigenen Zustand danebenhaelt; ueber die DATEI war es weg.
//
// Die Regel, die hier gemessen wird: ein Melder ERSETZT sein eigenes Fach und
// TRAEGT alle uebrigen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { emptySeed, type SeedGeraet, type SuiteSeed } from '../src/seed'
import { mergeSeedPatch } from '../src/seedOwnership'

const mitFach = (fachdaten: SeedGeraet['fachdaten']): SuiteSeed => ({
  ...emptySeed(1),
  geraete: [{ id: 'k1', name: 'CAM 1', kategorie: 'Cameras', ...(fachdaten ? { fachdaten } : {}) }],
})

describe('Fachdaten — getragen, nicht gelesen', () => {
  it('traegt das Fach eines FREMDEN Gewerks unveraendert durch', () => {
    // Der Kameraplan meldet. Was der Lichtplan an demselben Geraet fuehrt,
    // versteht er nicht — und genau deshalb darf er es nicht anfassen.
    const vorher = mitFach({ fixtures: { gobo: 'Breakup 3', shutters: [10, 0, 5, 0] } })
    const nachher = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 1,
      geraete: [{ id: 'k1', name: 'CAM 1', fachdaten: { cameras: { pan: 15, tilt: -8 } } }],
    }).seed

    expect(nachher.geraete[0].fachdaten).toEqual({
      fixtures: { gobo: 'Breakup 3', shutters: [10, 0, 5, 0] },
      cameras: { pan: 15, tilt: -8 },
    })
  })

  it('ERSETZT das eigene Fach, statt es zu mischen', () => {
    // Nur der Eigentuemer weiss, was ein fehlendes Feld in seinem Fach
    // bedeutet. Ein Mischen liesse einen geloeschten Wert wiederauferstehen.
    const vorher = mitFach({ cameras: { pan: 15, tilt: -8, extender: 2 } })
    const nachher = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 1,
      geraete: [{ id: 'k1', name: 'CAM 1', fachdaten: { cameras: { pan: 90 } } }],
    }).seed

    expect(nachher.geraete[0].fachdaten).toEqual({ cameras: { pan: 90 } })
  })

  it('„nichts gesagt" ist keine Loeschung', () => {
    // Der Fall, an dem die Ausrichtung eine Ebene hoeher verlorenging: eine
    // Meldung, die das Fach nicht nennt, nimmt es nicht weg.
    const vorher = mitFach({ cameras: { pan: 15 } })
    const nachher = mergeSeedPatch(vorher, {
      domain: 'cameras',
      revision: 1,
      geraete: [{ id: 'k1', name: 'CAM 1 neu' }],
    }).seed

    expect(nachher.geraete[0].name).toBe('CAM 1 neu')
    expect(nachher.geraete[0].fachdaten).toEqual({ cameras: { pan: 15 } })
  })

  it('der Signalplan traegt BEIDE fremden Faecher', () => {
    // Er fasst die Fachgruppen `kamera`/`licht` nicht an — und die Faecher
    // ebensowenig. Er ist der Plan, durch den am meisten hindurchlaeuft.
    const vorher = mitFach({ cameras: { pan: 15 }, fixtures: { gobo: 'Breakup 3' } })
    const nachher = mergeSeedPatch(vorher, {
      domain: 'signal',
      revision: 1,
      geraete: [{ id: 'k1', name: 'CAM 1', sub: '3x SDI Out' }],
    }).seed

    expect(nachher.geraete[0].sub).toBe('3x SDI Out')
    expect(nachher.geraete[0].fachdaten).toEqual({
      cameras: { pan: 15 },
      fixtures: { gobo: 'Breakup 3' },
    })
  })

  it('a nach b nach c und wieder nach a — nichts geht verloren', () => {
    // Der Satz des Eigentuemers als Lauf. Drei Planer fassen dasselbe Geraet
    // nacheinander an; am Ende steht jedes Fach so da, wie sein Eigentuemer
    // es zuletzt geschrieben hat.
    let seed = mitFach(undefined)

    const melde = (domain: 'cameras' | 'fixtures' | 'signal', g: SeedGeraet) => {
      seed = mergeSeedPatch(seed, { domain, revision: seed.revision, geraete: [g] }).seed
    }

    melde('cameras', { id: 'k1', name: 'CAM 1', fachdaten: { cameras: { pan: 15, tilt: -8, aperture: 5.6 } } })
    melde('fixtures', { id: 'k1', name: 'CAM 1', fachdaten: { fixtures: { gobo: 'Breakup 3' } } })
    melde('signal', { id: 'k1', name: 'CAM 1', sub: '3x SDI Out', fachdaten: { signal: { ports: ['SDI 1', 'SDI 2'] } } })
    // Zurueck bei a: der Kameraplan aendert nur seines.
    melde('cameras', { id: 'k1', name: 'CAM 1', fachdaten: { cameras: { pan: 90, tilt: -8, aperture: 5.6 } } })

    expect(seed.geraete[0].fachdaten).toEqual({
      cameras: { pan: 90, tilt: -8, aperture: 5.6 },
      fixtures: { gobo: 'Breakup 3' },
      signal: { ports: ['SDI 1', 'SDI 2'] },
    })
    expect(seed.geraete[0].sub).toBe('3x SDI Out')
  })
})

import { describe, expect, it } from 'vitest'
import { deriveBedarf, emptySeed } from '../src/seed'
import { mergeSeedPatch } from '../src/seedOwnership'

// ───────────────────────────────────────────────────────────────────────────
// Der Bedarf: die Leitung vom Plan ins Lager (2026-09-18).
//
// Drei Regeln, und alle drei sind aelter als diese Datei — sie stehen in
// ADR-001, ADR-002 und ADR-006 und wurden hier zum ersten Mal gemessen:
//
//   1. Zusammengefasst wird ueber das MODELL, nie ueber den Namen.
//   2. Ein Geraet ohne Modell wird nicht ersatzweise ueber den Namen
//      zusammengefasst — es bleibt eine eigene, markierte Zeile.
//   3. Ein Geraet zaehlt EINMAL, auch wenn mehrere Plaene es fuehren. Seit
//      ADR-011 Stufe 4 gibt es dafuer keine Ausnahmeliste mehr: die Doppelung
//      ist nicht behandelt, sondern weg — es gibt nur noch eine Liste.
// ───────────────────────────────────────────────────────────────────────────

const leer = { geraete: [] }

describe('deriveBedarf', () => {
  it('fasst zwei Instanzen desselben Modells zu einer Zeile zusammen', () => {
    // Genau der Fall aus ADR-002: „Kamera 1" und „Kamera 2" sind EIN Modell
    // mit Menge 2 und nicht zwei Lagerpositionen à 1 Stueck.
    const b = deriveBedarf({
      ...leer,
      geraete: [
        { id: 'c1', name: 'Kamera 1', kategorie: 'Cameras', model: 'Sony FX9' },
        { id: 'c2', name: 'Kamera 2', kategorie: 'Cameras', model: 'Sony FX9' },
      ],
    })

    expect(b).toEqual([
      { key: 'sony fx9', label: 'Sony FX9', category: 'camera', quantity: 2, fromDomain: 'cameras' },
    ])
  })

  it('fasst Geraete OHNE Modell NICHT zusammen', () => {
    // Die Gegenrichtung desselben Fehlers: zwei namenlose Geraete sind zwei
    // unbekannte Geraete. Sie zu Menge 2 zu addieren behauptet, sie seien
    // dasselbe Modell — und niemand hat das gesagt.
    const b = deriveBedarf({
      ...leer,
      geraete: [
        { id: 'c1', name: 'Kamera 1', kategorie: 'Cameras' },
        { id: 'c2', name: 'Kamera 2', kategorie: 'Cameras' },
      ],
    })

    expect(b).toHaveLength(2)
    expect(b.every((z) => z.modellUnbekannt === true)).toBe(true)
    expect(b.map((z) => z.label)).toEqual(['Kamera 1', 'Kamera 2'])
  })

  it('zaehlt ein Geraet einmal, obwohl Kamera- UND Signalplan es fuehren', () => {
    // Bis Stufe 3 standen dieselbe Kamera zweimal im Seed — einmal als Kamera,
    // einmal als Knoten im Signalweg — und der Bedarf brauchte eine Liste der
    // vertretenen Knoten, um nicht zwei Bleche anzufordern. Jetzt ist es ein
    // Eintrag, der in beiden Plaenen vorkommt.
    const seed = {
      geraete: [{ id: 'cam2', name: 'CAM 2', kategorie: 'Cameras', model: 'Sony FX9' }],
    }

    expect(deriveBedarf(seed)).toEqual([
      { key: 'sony fx9', label: 'Sony FX9', category: 'camera', quantity: 1, fromDomain: 'cameras' },
    ])
  })

  it('haelt Leuchten und Geraete auseinander, aber nicht ueber die Kategorie allein', () => {
    const b = deriveBedarf({
      geraete: [
        { id: 'f1', name: 'Key', kategorie: 'Lights', model: 'Aputure LS 600x' },
        { id: 'd1', name: 'Mischer', model: 'ATEM 4 M/E' },
      ],
    })

    expect(b.map((z) => [z.label, z.fromDomain, z.category])).toEqual([
      ['Aputure LS 600x', 'fixtures', 'fixture'],
      ['ATEM 4 M/E', 'signal', undefined],
    ])
  })

  it('ignoriert ein Modell, das nur aus Leerzeichen besteht', () => {
    const b = deriveBedarf({
      geraete: [{ id: 'c1', name: 'Kamera 1', kategorie: 'Cameras', model: '   ' }],
    })
    expect(b[0]!.modellUnbekannt).toBe(true)
  })
})

describe('Die zwei neuen Domaenen melden nur ihr eigenes Fach', () => {
  it('das Lager setzt die Deckung', () => {
    const seed = emptySeed(3)
    const { seed: next } = mergeSeedPatch(seed, {
      domain: 'lager',
      revision: 3,
      deckung: [{ key: 'fx9', benoetigt: 4, gedeckt: 2 }],
    })

    expect(next.deckung).toEqual([{ key: 'fx9', benoetigt: 4, gedeckt: 2 }])
  })

  it('das Lager kann den Bedarf NICHT umschreiben', () => {
    // Der Bedarf ist eine Ableitung des Plans. Duerfte das Lager ihn melden,
    // haette es eine Meinung darueber, was die Show braucht — ADR-006 in der
    // Gegenrichtung.
    const seed = { ...emptySeed(3), bedarf: [{ key: 'a', label: 'A', quantity: 1, fromDomain: 'signal' as const }] }
    const { seed: next } = mergeSeedPatch(seed, {
      domain: 'lager',
      revision: 3,
      geraete: [{ id: 'x', name: 'Geschmuggelt' }],
    })

    expect(next.bedarf).toEqual(seed.bedarf)
    expect(next.geraete).toEqual([])
  })

  it('das Gebaeude setzt die Anschlusspunkte', () => {
    const { seed: next } = mergeSeedPatch(emptySeed(1), {
      domain: 'gebaeude',
      revision: 1,
      anschluesse: [{ id: 'p1', bezeichnung: 'Bühne links', art: 'dose', anschlussart: 'CEE 32', absicherungA: 32 }],
    })

    expect(next.anschluesse).toHaveLength(1)
    expect(next.anschluesse[0]!.dauerleistungW).toBeUndefined()
  })

  it('ein Planer kann die Anschlusspunkte des Hauses nicht setzen', () => {
    const { seed: next } = mergeSeedPatch(emptySeed(1), {
      domain: 'signal',
      revision: 1,
      anschluesse: [{ id: 'p1', bezeichnung: 'Erfunden', art: 'dose', anschlussart: 'Schuko', absicherungA: 16 }],
    })

    expect(next.anschluesse).toEqual([])
  })
})

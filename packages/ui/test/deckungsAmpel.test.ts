import { describe, expect, it } from 'vitest'
import { deckungsAmpel, zaehleAmpeln } from '../src/deckung'
import type { SeedBedarf } from '../src/seed'

// ───────────────────────────────────────────────────────────────────────────
// suite#260 / B-78 — die Antwort des Lagers als Ampel.
//
// Der eine Unterschied, auf den alles ankommt: „nicht gezaehlt" ist nicht
// „fehlt". Die Tests darunter halten ihn in beide Richtungen fest — keine
// Antwort und eine Antwort ohne Zaehlung sind beide `unbekannt`, und erst
// eine gezaehlte Null ist `fehlt`.
// ───────────────────────────────────────────────────────────────────────────

const zeile = (key: string, quantity: number, extra: Partial<SeedBedarf> = {}): SeedBedarf => ({
  key,
  label: key,
  quantity,
  fromDomain: 'cameras',
  ...extra,
})

describe('deckungsAmpel', () => {
  it('voll gedeckt ist verfuegbar — auch wenn mehr im Regal liegt', () => {
    const [z] = deckungsAmpel([zeile('sony fx9', 2)], [{ key: 'sony fx9', benoetigt: 2, gedeckt: 5 }])
    expect(z).toMatchObject({ ampel: 'verfuegbar', gedeckt: 5, fehlmenge: 0 })
    expect(z!.antwortFuer).toBeUndefined()
  })

  it('teilweise gedeckt ist subhire, und die Fehlmenge steht dabei', () => {
    const [z] = deckungsAmpel([zeile('sony fx9', 4)], [{ key: 'sony fx9', benoetigt: 4, gedeckt: 3 }])
    expect(z).toMatchObject({ ampel: 'subhire', gedeckt: 3, fehlmenge: 1 })
  })

  it('eine GEZAEHLTE Null ist fehlt', () => {
    const [z] = deckungsAmpel([zeile('kl panel xl', 2)], [{ key: 'kl panel xl', benoetigt: 2, gedeckt: 0 }])
    expect(z).toMatchObject({ ampel: 'fehlt', gedeckt: 0, fehlmenge: 2 })
  })

  it('ohne Zaehlung ist unbekannt und NICHT fehlt', () => {
    // Das Lager fuehrt zu dieser Zeile keine Position. „0 vorhanden" waere
    // eine Behauptung ueber einen Bestand, den niemand angesehen hat.
    const [z] = deckungsAmpel([zeile('par 64', 1)], [{ key: 'par 64', benoetigt: 1 }])
    expect(z).toMatchObject({ ampel: 'unbekannt', unbekanntWeil: 'nicht-gezaehlt' })
    expect(z!.gedeckt).toBeUndefined()
    expect(z!.fehlmenge).toBeUndefined()
  })

  it('ohne Antwort des Lagers ist unbekannt — mit einem anderen Grund', () => {
    const [z] = deckungsAmpel([zeile('par 64', 1)], [])
    expect(z).toMatchObject({ ampel: 'unbekannt', unbekanntWeil: 'keine-antwort' })
  })

  it('misst gegen die HEUTIGE Menge und sagt, wenn die Antwort einer anderen galt', () => {
    // Der Plan braucht inzwischen drei; das Lager hat auf zwei geantwortet
    // und dabei zwei gezaehlt. Die Ampel wird gegen drei gerechnet — und
    // traegt mit, dass die Antwort aelter ist.
    const [z] = deckungsAmpel([zeile('sony fx9', 3)], [{ key: 'sony fx9', benoetigt: 2, gedeckt: 2 }])
    expect(z).toMatchObject({ ampel: 'subhire', fehlmenge: 1, antwortFuer: 2 })
  })

  it('laesst Antworten zu Zeilen fallen, die der Plan nicht mehr fuehrt', () => {
    const zeilen = deckungsAmpel([zeile('a', 1)], [
      { key: 'a', benoetigt: 1, gedeckt: 1 },
      { key: 'weg', benoetigt: 4, gedeckt: 0 },
    ])
    expect(zeilen.map((z) => z.bedarf.key)).toEqual(['a'])
  })

  it('behaelt die Reihenfolge des Bedarfs und zaehlt je Ampel', () => {
    const zeilen = deckungsAmpel(
      [zeile('a', 1), zeile('b', 2), zeile('c', 1), zeile('d', 1)],
      [
        { key: 'a', benoetigt: 1, gedeckt: 1 },
        { key: 'b', benoetigt: 2, gedeckt: 1 },
        { key: 'c', benoetigt: 1, gedeckt: 0 },
      ],
    )
    expect(zeilen.map((z) => z.ampel)).toEqual(['verfuegbar', 'subhire', 'fehlt', 'unbekannt'])
    expect(zaehleAmpeln(zeilen)).toEqual({ verfuegbar: 1, subhire: 1, fehlt: 1, unbekannt: 1 })
  })
})

import { describe, expect, it } from 'vitest'
import {
  FLAECHE,
  STILLE_MS,
  fuehreFlaecheZusammen,
  juenger,
  markiere,
  nochDa,
  seither,
  type MitmachFlaeche,
  type Staende,
} from '../src/mitmachen'

/**
 * DAS ZUSAMMENFÜHREN — und die eine Eigenschaft, an der alles hängt.
 *
 * Reihenfolge-Unabhängigkeit: zwei Rechner, die dieselben Änderungen in
 * anderer Folge bekommen, müssen dasselbe sehen. Ohne sie ist „Echtzeit"
 * nur ein schnelleres Auseinanderlaufen — und genau deshalb stand im
 * Backlog, ein halbes Echtzeit-Board wäre schlimmer als keins.
 */
const f = (cards: { id: string; t?: string; x?: number }[], rest: Record<string, unknown> = {}): MitmachFlaeche => ({
  cards,
  connections: [],
  ...rest,
})

describe('juenger', () => {
  it('nimmt den jüngeren Stand', () => {
    expect(juenger({ wann: 1, wer: 'a' }, { wann: 2, wer: 'b' })).toEqual({ wann: 2, wer: 'b' })
  })

  it('entscheidet Gleichstand nach fester Ordnung, nicht nach Ankunft', () => {
    // Sonst kämen zwei Rechner mit denselben zwei Ständen auf
    // verschiedene Ergebnisse.
    const a = { wann: 5, wer: 'anna' }
    const b = { wann: 5, wer: 'bert' }
    expect(juenger(a, b)).toBe(juenger(b, a))
    expect(juenger(a, b)).toEqual(b)
  })

  it('lässt bei gleicher Uhr und gleichem Absender die Löschung gewinnen', () => {
    const leben = { wann: 5, wer: 'a' }
    const tot = { wann: 5, wer: 'a', tot: true }
    expect(juenger(leben, tot)).toEqual(tot)
    expect(juenger(tot, leben)).toEqual(tot)
  })
})

describe('fuehreFlaecheZusammen', () => {
  it('ist reihenfolge-unabhängig', () => {
    const a = f([{ id: 'k1', t: 'meins' }, { id: 'k2' }])
    const sa: Staende = { k1: { wann: 10, wer: 'anna' }, k2: { wann: 1, wer: 'anna' } }
    const b = f([{ id: 'k1', t: 'deins' }, { id: 'k3' }])
    const sb: Staende = { k1: { wann: 20, wer: 'bert' }, k3: { wann: 5, wer: 'bert' } }

    const ab = fuehreFlaecheZusammen(a, sa, b, sb)
    const ba = fuehreFlaecheZusammen(b, sb, a, sa)
    expect([...ab.flaeche.cards].map((k) => k.id).sort()).toEqual([...ba.flaeche.cards].map((k) => k.id).sort())
    expect(ab.staende).toEqual(ba.staende)
    // Und der Inhalt der umkämpften Karte ist auf beiden Seiten derselbe.
    const inhalt = (z: typeof ab) => z.flaeche.cards.find((k) => k.id === 'k1')!.t
    expect(inhalt(ab)).toBe('deins')
    expect(inhalt(ba)).toBe('deins')
  })

  it('behält die Anordnung der eigenen Fläche und hängt Neues hinten an', () => {
    // Die Anordnung IST der Inhalt (ADR-001) — eine Sortierung nach Zeit
    // würfelte das Board durcheinander.
    const a = f([{ id: 'k1' }, { id: 'k2' }])
    const b = f([{ id: 'k3' }, { id: 'k1' }])
    const r = fuehreFlaecheZusammen(a, { k1: { wann: 1, wer: 'a' }, k2: { wann: 1, wer: 'a' } }, b, { k3: { wann: 2, wer: 'b' } })
    expect(r.flaeche.cards.map((k) => k.id)).toEqual(['k1', 'k2', 'k3'])
  })

  it('lässt eine gelöschte Karte nicht zurückkehren', () => {
    // DER Fall, für den es die Grabsteine gibt: der andere kennt die Karte
    // noch, und „ich habe sie nicht" ist ununterscheidbar von „ich habe sie
    // nie gesehen".
    const gelöscht = f([{ id: 'k2' }])
    const sGelöscht: Staende = { k1: { wann: 9, wer: 'anna', tot: true }, k2: { wann: 1, wer: 'anna' } }
    const hatSieNoch = f([{ id: 'k1' }, { id: 'k2' }])
    const sAlt: Staende = { k1: { wann: 1, wer: 'bert' }, k2: { wann: 1, wer: 'bert' } }

    expect(fuehreFlaecheZusammen(gelöscht, sGelöscht, hatSieNoch, sAlt).flaeche.cards.map((k) => k.id)).toEqual(['k2'])
    expect(fuehreFlaecheZusammen(hatSieNoch, sAlt, gelöscht, sGelöscht).flaeche.cards.map((k) => k.id)).toEqual(['k2'])
  })

  it('lässt eine Löschung von einer jüngeren Bearbeitung überstimmen', () => {
    const gelöscht = f([])
    const bearbeitet = f([{ id: 'k1', t: 'doch noch' }])
    const r = fuehreFlaecheZusammen(
      gelöscht,
      { k1: { wann: 5, wer: 'anna', tot: true } },
      bearbeitet,
      { k1: { wann: 9, wer: 'bert' } },
    )
    expect(r.flaeche.cards).toHaveLength(1)
    expect(r.flaeche.cards[0]!.t).toBe('doch noch')
  })

  it('wirft eine Verbindung weg, deren Karte gelöscht wurde', () => {
    // Nicht „reparieren": eine Linie ins Leere wäre eine Aussage über etwas,
    // das es nicht mehr gibt.
    const a: MitmachFlaeche = { cards: [{ id: 'k1' }], connections: [{ id: 'v1', from: 'k1', to: 'k2' }] }
    const b: MitmachFlaeche = { cards: [{ id: 'k1' }], connections: [] }
    const r = fuehreFlaecheZusammen(a, { k2: { wann: 3, wer: 'a', tot: true } }, b, {})
    expect(r.flaeche.connections).toEqual([])
  })

  it('führt die Felder der Fläche über einen eigenen Stand', () => {
    // „Jemand hat das Bildformat geändert" darf nicht an einer beliebigen
    // Karte hängen.
    const a = f([{ id: 'k1' }], { format: '16:9' })
    const b = f([{ id: 'k1' }], { format: '2.39:1' })
    const r = fuehreFlaecheZusammen(a, { [FLAECHE]: { wann: 1, wer: 'a' } }, b, { [FLAECHE]: { wann: 2, wer: 'b' } })
    expect(r.flaeche.format).toBe('2.39:1')
  })

  it('kommt mit einer leeren Gegenseite zurecht', () => {
    const a = f([{ id: 'k1' }])
    const r = fuehreFlaecheZusammen(a, { k1: { wann: 1, wer: 'a' } }, f([]), {})
    expect(r.flaeche.cards.map((k) => k.id)).toEqual(['k1'])
  })
})

describe('markiere und seither', () => {
  it('schreibt den Stand fort, ohne den alten zu verändern', () => {
    const alt: Staende = { k1: { wann: 1, wer: 'a' } }
    const neu = markiere(alt, ['k1', 'k2'], 'b', 7)
    expect(alt.k1).toEqual({ wann: 1, wer: 'a' })
    expect(neu.k1).toEqual({ wann: 7, wer: 'b' })
    expect(neu.k2).toEqual({ wann: 7, wer: 'b' })
  })

  it('nennt nur, was NACH dem Zeitpunkt kam', () => {
    // `>` und nicht `>=`: sonst käme bei jedem Takt wieder dasselbe.
    const s = markiere(markiere({}, ['alt'], 'a', 5), ['neu'], 'a', 9)
    expect(seither(s, 5)).toEqual(['neu'])
    expect(seither(s, 9)).toEqual([])
  })
})

describe('nochDa', () => {
  const wer = (sitzung: string, zuletzt: number) => ({ sitzung, name: sitzung, farbe: '#fff', initialen: 'XX', zuletzt })

  it('lässt sich selbst aus', () => {
    expect(nochDa([wer('ich', 100), wer('du', 100)], 100, 'ich').map((a) => a.sitzung)).toEqual(['du'])
  })

  it('vergisst, wer zu lange schweigt', () => {
    const jetzt = 100_000
    const da = nochDa([wer('frisch', jetzt - 1000), wer('weg', jetzt - STILLE_MS - 1)], jetzt)
    expect(da.map((a) => a.sitzung)).toEqual(['frisch'])
  })
})

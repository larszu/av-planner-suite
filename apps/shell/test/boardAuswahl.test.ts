import { describe, expect, it } from 'vitest'
import { imRahmen, layoutBoard } from '../src/data/board'
import type { BoardCard } from '../src/data/project'

/**
 * DER AUSWAHLRAHMEN — die Geste, die auf dem Board gefehlt hat.
 *
 * Nutzer-Meldung 2026-09-20: „die boards sind überhaupt nicht ausgereift.
 * Mache sie eher wie milanote."
 *
 * Bis dahin gab es genau eine ausgewählte Karte. Wer zwölf Bilder zur Seite
 * schieben wollte, schob zwölfmal. Der Rahmen ist die Hälfte davon, die eine
 * Regel trägt — und deshalb steht sie als reine Funktion in `data/board.ts`
 * und nicht im Ereignis-Handler der Fläche, wo sie niemand messen könnte.
 */
const note = (id: string, x: number, y: number, w = 200): BoardCard => ({ id, type: 'note', x, y, w })

describe('imRahmen', () => {
  it('sammelt eine Karte ein, die der Rahmen nur BERÜHRT', () => {
    const cards = [note('a', 100, 100)]
    const layout = layoutBoard(cards)
    // Der Rahmen deckt nur die linke obere Ecke — auf einem Moodboard ist das
    // der Normalfall, weil die Bilder größer sind als der Blick.
    expect(imRahmen(cards, layout, { x: 60, y: 60, w: 60, h: 60 })).toEqual(['a'])
  })

  it('lässt eine Karte aus, die der Rahmen nur streift', () => {
    const cards = [note('a', 100, 100)]
    const layout = layoutBoard(cards)
    // Kante an Kante: 40+60 endet genau dort, wo die Karte anfängt.
    expect(imRahmen(cards, layout, { x: 40, y: 100, w: 60, h: 60 })).toEqual([])
  })

  it('greift nicht nach Karten außerhalb', () => {
    const cards = [note('a', 100, 100), note('b', 900, 900)]
    const layout = layoutBoard(cards)
    expect(imRahmen(cards, layout, { x: 50, y: 50, w: 300, h: 300 })).toEqual(['a'])
  })

  it('nimmt mehrere in der Reihenfolge der Karten', () => {
    const cards = [note('a', 100, 100), note('b', 320, 120), note('c', 2000, 2000)]
    const layout = layoutBoard(cards)
    expect(imRahmen(cards, layout, { x: 80, y: 80, w: 600, h: 400 })).toEqual(['a', 'b'])
  })

  it('ist bei einem Rahmen ohne Fläche leer — ein Klick wählt nicht alles aus', () => {
    const cards = [note('a', 100, 100)]
    const layout = layoutBoard(cards)
    expect(imRahmen(cards, layout, { x: 150, y: 150, w: 0, h: 0 })).toEqual([])
  })

  it('findet auch ein Spalten-Mitglied an seiner GELEGTEN Stelle, nicht an seiner eigenen', () => {
    // Die Karte trägt x/y 0, liegt aber durch die Spalte bei ~100/134. Wer den
    // Rahmen gegen die Rohdaten prüfte statt gegen das Layout, sammelte sie am
    // falschen Ort ein — sichtbar erst, wenn jemand eine Spalte benutzt.
    const cards: BoardCard[] = [
      { id: 'col', type: 'column', x: 100, y: 100, w: 280, title: 'Spalte' },
      { id: 'm', type: 'note', x: 0, y: 0, w: 0, columnId: 'col' },
    ]
    const layout = layoutBoard(cards)
    expect(imRahmen(cards, layout, { x: 90, y: 90, w: 300, h: 300 })).toContain('m')
    expect(imRahmen(cards, layout, { x: 0, y: 0, w: 40, h: 40 })).toEqual([])
  })
})

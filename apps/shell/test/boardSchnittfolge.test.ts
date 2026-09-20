import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHOT_S,
  boardToMarkdown,
  cardHeight,
  formatLaufzeit,
  layoutBoard,
  sceneGroups,
  sceneOf,
  sequenceSeconds,
  shotAt,
  shotSequence,
} from '../src/data/board'
import type { Board, BoardCard } from '../src/data/project'

/**
 * DAS BOARD ALS FILM.
 *
 * Nutzer-Auftrag 2026-09-20: das Board soll auch wie `recceboard` sein — dort
 * ist ein Board keine Pinnwand, sondern eine FOLGE: die Einstellungen laufen
 * der Reihe nach, jede mit ihrer Standzeit.
 *
 * Die Reihenfolge wird ABGELESEN und nicht zusätzlich verwaltet: wer eine
 * Karte verschiebt, schneidet damit um. Eine zweite Liste neben der Lage wäre
 * die zweite Wahrheit aus ADR-001 — sie stimmte genau bis zum ersten Zug.
 *
 * Deshalb misst dieser Test vor allem eins: dass aus einer Lage dieselbe
 * Folge entsteht, die ein Mensch ablesen würde.
 */
const bild = (id: string, x: number, y: number, over: Partial<BoardCard> = {}): BoardCard => ({
  id,
  type: 'image',
  x,
  y,
  w: 200,
  ratio: 16 / 9,
  ...over,
})

const board = (cards: BoardCard[], rest: Partial<Board> = {}): Board => ({
  cards,
  connections: [],
  ...rest,
})

describe('shotSequence', () => {
  it('liest zeilenweise von oben, in der Zeile von links', () => {
    const b = board([
      bild('c', 600, 400),
      bild('a', 100, 100),
      bild('b', 400, 100),
    ])
    expect(shotSequence(b).map((s) => s.card.id)).toEqual(['a', 'b', 'c'])
  })

  it('behandelt eine Zeile als BAND, nicht als Linie', () => {
    // Zwei Bilder, zwölf Pixel gegeneinander versetzt: fürs Auge nebeneinander.
    // Ohne Band käme das tiefere eine Einstellung später, und niemand sähe warum.
    const b = board([bild('rechts', 400, 112), bild('links', 100, 100)])
    expect(shotSequence(b).map((s) => s.card.id)).toEqual(['links', 'rechts'])
  })

  it('nimmt nur Einstellungen — eine Notiz ist keine', () => {
    const b = board([
      bild('bild', 100, 100),
      { id: 'notiz', type: 'note', x: 300, y: 100, w: 200, text: 'kein Shot' },
      { id: 'look', type: 'look', x: 500, y: 100, w: 190, color: '#f5a623' },
      { id: 'todo', type: 'todo', x: 700, y: 100, w: 200 },
    ])
    expect(shotSequence(b).map((s) => s.card.id)).toEqual(['bild', 'look'])
  })

  it('nummeriert ab 1 und legt die Startzeiten hintereinander', () => {
    const b = board([bild('a', 100, 100), bild('b', 400, 100), bild('c', 700, 100)])
    const shots = shotSequence(b)
    expect(shots.map((s) => s.nr)).toEqual([1, 2, 3])
    expect(shots.map((s) => s.startS)).toEqual([0, DEFAULT_SHOT_S, DEFAULT_SHOT_S * 2])
  })

  it('nimmt die Standzeit der Karte, sonst die des Boards, sonst die Vorgabe', () => {
    const b = board([bild('eigen', 100, 100, { durationS: 5 }), bild('vom-board', 400, 100)], {
      shotSeconds: 2,
    })
    expect(shotSequence(b).map((s) => s.durationS)).toEqual([5, 2])
    // Ohne Board-Vorgabe greift DEFAULT_SHOT_S.
    expect(shotSequence(board([bild('x', 0, 0)]))[0]!.durationS).toBe(DEFAULT_SHOT_S)
  })

  it('liest eine Null NICHT als Standzeit null', () => {
    // `durationS: 0` hiesse „wird übersprungen" — eine Aussage, die niemand
    // gemacht hat. Eine fehlende Angabe ist keine Null (Hausregel).
    const b = board([bild('a', 100, 100, { durationS: 0 })])
    expect(shotSequence(b)[0]!.durationS).toBe(DEFAULT_SHOT_S)
  })

  it('nimmt Karten IN einer Spalte mit, an der Stelle der Spalte', () => {
    const cards: BoardCard[] = [
      { id: 'col', type: 'column', x: 100, y: 100, w: 280, title: 'Sequenz 1' },
      bild('m1', 0, 0, { columnId: 'col' }),
      bild('m2', 0, 0, { columnId: 'col' }),
      bild('frei', 900, 100),
    ]
    const b = board(cards)
    const ids = shotSequence(b, layoutBoard(cards)).map((s) => s.card.id)
    // Eine Spalte ist auf diesen Boards eine Sequenz; sie zu überspringen
    // liesse den halben Film weg.
    expect(ids).toContain('m1')
    expect(ids).toContain('m2')
    expect(ids.indexOf('m1')).toBeLessThan(ids.indexOf('m2'))
  })

  it('ist auf einem Board ohne Einstellungen leer und null Sekunden lang', () => {
    const b = board([{ id: 'n', type: 'note', x: 0, y: 0, w: 200 }])
    expect(shotSequence(b)).toEqual([])
    expect(sequenceSeconds(shotSequence(b))).toBe(0)
  })
})

describe('shotAt', () => {
  it('findet die laufende Einstellung und endet mit dem Film', () => {
    const shots = shotSequence(board([bild('a', 100, 100), bild('b', 400, 100)], { shotSeconds: 2 }))
    expect(shotAt(shots, 0)?.card.id).toBe('a')
    expect(shotAt(shots, 1.9)?.card.id).toBe('a')
    // Die Grenze gehört der FOLGENDEN Einstellung: bei 2,0 s ist umgeschnitten.
    expect(shotAt(shots, 2)?.card.id).toBe('b')
    expect(shotAt(shots, 4)).toBeNull()
  })
})

describe('formatLaufzeit', () => {
  it('schreibt Minuten und Sekunden, wie eine Laufzeit gelesen wird', () => {
    expect(formatLaufzeit(0)).toBe('0:00')
    expect(formatLaufzeit(9)).toBe('0:09')
    expect(formatLaufzeit(64)).toBe('1:04')
    expect(formatLaufzeit(600)).toBe('10:00')
  })
})

/**
 * SZENEN — wörtlich aus der Hilfe von recceboard: „Shots placed close together
 * on the same line are joined by a dotted line: they read as one scene. Pull
 * one away and the link breaks."
 *
 * Auch das wird abgelesen und nicht geführt. Der zweite Satz ist der Test:
 * wegziehen muss die Szene trennen, ohne dass jemand eine Gruppe auflöst.
 */
describe('sceneGroups', () => {
  const gruppen = (cards: BoardCard[]) => {
    const b = board(cards)
    const l = layoutBoard(cards)
    return sceneGroups(shotSequence(b, l), l).map((g) => g.map((s) => s.card.id))
  }

  it('fasst zwei dicht nebeneinander liegende Einstellungen zu einer Szene', () => {
    // 100..300, dann 340 — 40 px Lücke, unter SZENEN_LUECKE.
    expect(gruppen([bild('a', 100, 100), bild('b', 340, 100)])).toEqual([['a', 'b']])
  })

  it('trennt, sobald eine weggezogen wird', () => {
    // Dieselben zwei Karten, die zweite 200 px weiter rechts.
    expect(gruppen([bild('a', 100, 100), bild('b', 600, 100)])).toEqual([['a'], ['b']])
  })

  it('trennt über Zeilen hinweg, auch wenn die Lücke klein wäre', () => {
    const g = gruppen([bild('oben', 100, 100), bild('unten', 340, 400)])
    expect(g).toEqual([['oben'], ['unten']])
  })

  it('zählt eine einzeln stehende Einstellung als eigene Szene', () => {
    // Kein Loch in der Nummerierung: „szenenlos" wäre eine Aussage, die
    // niemand gemacht hat.
    expect(gruppen([bild('allein', 100, 100)])).toEqual([['allein']])
  })

  it('misst die Lücke zwischen den KANTEN, nicht zwischen den Mittelpunkten', () => {
    // Zwei breite Karten mit demselben sichtbaren Abstand wie zwei schmale
    // müssen dieselbe Antwort geben.
    const schmal = gruppen([bild('a', 100, 100, { w: 100 }), bild('b', 240, 100, { w: 100 })])
    const breit = gruppen([bild('a', 100, 100, { w: 400 }), bild('b', 540, 100, { w: 400 })])
    expect(schmal).toEqual([['a', 'b']])
    expect(breit).toEqual([['a', 'b']])
  })

  it('nennt zu jeder Einstellung ihre Szene', () => {
    const cards = [bild('a', 100, 100), bild('b', 340, 100), bild('c', 1200, 100)]
    const l = layoutBoard(cards)
    const g = sceneGroups(shotSequence(board(cards), l), l)
    expect(sceneOf(g, 'a')).toBe(1)
    expect(sceneOf(g, 'b')).toBe(1)
    expect(sceneOf(g, 'c')).toBe(2)
    expect(sceneOf(g, 'gibtsnicht')).toBeNull()
  })
})

/**
 * DATEI-KARTEN — die „vielseitigen Elemente" aus der Milanote-Beschreibung:
 * „Textnotizen, Bilder, To-Do-Listen, Links, Videos, Audio-Dateien und
 * Dokumente (PDFs, Word etc.)".
 *
 * Bis dahin fiel eine abgelegte PDF lautlos auf den Boden. Gemessen wird
 * hier die Regel, die beim Nachbauen schiefgehen kann: eine Karte hat eine
 * HÖHE, und eine unbekannte Kartenart hätte keine.
 */
describe('Datei-Karten', () => {
  it('gibt jeder neuen Kartenart eine Höhe', () => {
    for (const type of ['video', 'audio', 'file'] as const) {
      const h = cardHeight({ id: 'x', type, x: 0, y: 0, w: 260, ratio: 16 / 9 })
      expect(h, type).toBeGreaterThan(0)
    }
  })

  it('rechnet die Höhe eines Films aus seinem Seitenverhältnis plus Bedienleiste', () => {
    const breit = cardHeight({ id: 'x', type: 'video', x: 0, y: 0, w: 320, ratio: 16 / 9 })
    const hoch = cardHeight({ id: 'x', type: 'video', x: 0, y: 0, w: 320, ratio: 9 / 16 })
    expect(hoch).toBeGreaterThan(breit)
    // Ohne den Zuschlag für die Bedienleiste schnitte die Karte genau die
    // Knöpfe ab, die man braucht.
    expect(breit).toBeGreaterThan(Math.round(320 / (16 / 9)))
  })

  it('schreibt im Markdown den Dateinamen und nicht die data-URL', () => {
    const md = boardToMarkdown(
      board([
        {
          id: 'f',
          type: 'file',
          x: 0,
          y: 0,
          w: 260,
          title: 'Ablaufplan',
          fileName: 'Ablaufplan.pdf',
          src: 'data:application/pdf;base64,AAAAAAAAAAAAAAAA',
        },
      ]),
      'Test',
    )
    expect(md).toContain('Ablaufplan.pdf')
    // Ein eingebettetes Video wäre dort ein Megabyte Zeichensalat.
    expect(md).not.toContain('data:')
  })

  it('zählt eine Datei-Karte NICHT als Einstellung', () => {
    // Eine PDF ist kein Bild: sie läuft im Film nicht mit, und die
    // Schnittfolge bliebe sonst an einer Tabelle hängen.
    const b = board([
      bild('bild', 100, 100),
      { id: 'pdf', type: 'file', x: 400, y: 100, w: 260, fileName: 'x.pdf' },
      { id: 'ton', type: 'audio', x: 700, y: 100, w: 260, fileName: 'x.wav' },
    ])
    expect(shotSequence(b).map((s) => s.card.id)).toEqual(['bild'])
  })
})

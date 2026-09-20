import { describe, expect, it } from 'vitest'
import {
  fadenFuer,
  farbeVon,
  fuehreKommentareZusammen,
  identitaetOk,
  initialenVon,
  offeneJeObjekt,
  schreibeKommentar,
  vollstaendig,
  type Kommentar,
} from '../src/embed'

/**
 * WER HIER ARBEITET, UND WAS ER SAGT.
 *
 * Nutzer-Auftrag 2026-09-20: „Baue alles was du begründet nicht gebaut hast
 * auch fertig und behebe alle Gründe global."
 *
 * Der Grund, aus dem es keine Kommentare gab, stand in `docs/board.md`: ein
 * Kommentar braucht einen Urheber, und die Anwendung kannte keinen. Die
 * Antwort darauf ist nicht, Kommentare ohne Namen zu bauen — sondern den
 * Namen zu beschaffen. Diese Tests halten beide Hälften fest.
 */
describe('Identität', () => {
  it('bildet zwei Zeichen aus dem ersten und dem LETZTEN Wort', () => {
    expect(initialenVon('Lars Zumpe')).toBe('LZ')
    // Nicht aus den ersten beiden: „Jan van der Berg" ist ein Berg, kein van.
    expect(initialenVon('Jan van der Berg')).toBe('JB')
    expect(initialenVon('lars')).toBe('LA')
    expect(initialenVon('anna-lena groß')).toBe('AG')
  })

  it('gibt bei einem leeren Namen nichts zurück — kein „??"', () => {
    // Ein Fragezeichen wäre eine Aussage über jemanden, den es nicht gibt.
    expect(initialenVon('')).toBe('')
    expect(initialenVon('   ')).toBe('')
  })

  it('gibt demselben Namen auf jedem Rechner dieselbe Farbe', () => {
    // Eine Zufallsfarbe wäre drüben eine andere, und „der Blaue" hiesse bei
    // zwei Leuten etwas Verschiedenes.
    expect(farbeVon('Lars Zumpe')).toBe(farbeVon('Lars Zumpe'))
    expect(farbeVon('Lars Zumpe')).toBe(farbeVon('  lars zumpe '))
    expect(farbeVon('Lars')).not.toBe(farbeVon('Mika'))
  })

  it('füllt beim Vervollständigen nur, was fehlt', () => {
    expect(vollstaendig({ name: 'Lars Zumpe' })).toEqual({
      name: 'Lars Zumpe',
      initialen: 'LZ',
      farbe: farbeVon('Lars Zumpe'),
    })
    expect(vollstaendig({ name: 'Lars Zumpe', initialen: 'LA', farbe: '#000000' })).toEqual({
      name: 'Lars Zumpe',
      initialen: 'LA',
      farbe: '#000000',
    })
  })

  it('erkennt eine Identität ohne Namen als untauglich', () => {
    expect(identitaetOk(undefined)).toBe(false)
    expect(identitaetOk({ name: '   ' })).toBe(false)
    expect(identitaetOk({ name: 'Lars' })).toBe(true)
  })
})

const ich = { name: 'Lars Zumpe' }
const schreibe = (over: Partial<Parameters<typeof schreibeKommentar>[0]> = {}) =>
  schreibeKommentar({ objektId: 'cam1', text: 'Ton brummt', autor: ich, jetzt: 1000, id: 'k1', ...over })

describe('Kommentare', () => {
  it('schreibt keinen Kommentar ohne Urheber', () => {
    const r = schreibe({ autor: undefined })
    expect(r).toEqual({ ok: false, grund: 'kein-autor' })
    // Das ist der ganze Punkt: „unbekannt" darunterzuschreiben wäre genau die
    // Erfindung, wegen der es die Kommentare vorher nicht gab.
  })

  it('schreibt keinen leeren Kommentar', () => {
    expect(schreibe({ text: '   ' })).toEqual({ ok: false, grund: 'leer' })
  })

  it('hält den Urheber vollständig fest, damit der Name bleibt', () => {
    const r = schreibe()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.kommentar.autor.name).toBe('Lars Zumpe')
    expect(r.kommentar.autor.initialen).toBe('LZ')
    expect(r.kommentar.autor.farbe).toBeTruthy()
    expect(r.kommentar.objektId).toBe('cam1')
  })

  it('ordnet den Faden nach dem GESPRÄCH und nicht nach der Datei', () => {
    const k = (id: string, zeit: number, antwortAuf?: string): Kommentar => ({
      id,
      objektId: 'cam1',
      autor: vollstaendig(ich),
      zeit,
      text: id,
      ...(antwortAuf ? { antwortAuf } : {}),
    })
    // Zwei Wurzeln, und eine späte Antwort auf die erste.
    const alle = [k('a', 100), k('b', 200), k('antwort-auf-a', 300, 'a')]
    expect(fadenFuer(alle, 'cam1').map((x) => x.id)).toEqual(['a', 'antwort-auf-a', 'b'])
  })

  it('verliert keine Antwort, deren Bezug fehlt', () => {
    const waise: Kommentar = {
      id: 'w',
      objektId: 'cam1',
      autor: vollstaendig(ich),
      zeit: 50,
      text: 'w',
      antwortAuf: 'gibtsnicht',
    }
    expect(fadenFuer([waise], 'cam1').map((x) => x.id)).toEqual(['w'])
  })

  it('zählt offene Kommentare je Objekt in EINEM Durchgang', () => {
    const mk = (id: string, objektId: string, erledigt?: boolean): Kommentar => ({
      id,
      objektId,
      autor: vollstaendig(ich),
      zeit: 1,
      text: id,
      ...(erledigt ? { erledigt } : {}),
    })
    const m = offeneJeObjekt([mk('1', 'cam1'), mk('2', 'cam1', true), mk('3', 'lampe7')])
    expect(m.get('cam1')).toBe(1)
    expect(m.get('lampe7')).toBe(1)
    expect(m.has('sonst')).toBe(false)
  })
})

describe('Zusammenführen über den Seed', () => {
  const mk = (id: string, erledigt?: boolean): Kommentar => ({
    id,
    objektId: 'cam1',
    autor: vollstaendig(ich),
    zeit: Number(id),
    text: id,
    ...(erledigt ? { erledigt } : {}),
  })

  it('überschreibt eine Äusserung nie — sie ist ein Ereignis, kein Feld', () => {
    const zusammen = fuehreKommentareZusammen([mk('1'), mk('2')], [mk('2'), mk('3')])
    expect(zusammen.map((k) => k.id)).toEqual(['1', '2', '3'])
  })

  it('lässt den Erledigt-Haken gewinnen, in BEIDE Richtungen', () => {
    // Abhaken ist die einzige Änderung, die ein Kommentar kennt, und sie geht
    // nur in eine Richtung. Damit ist das Ergebnis reihenfolgeunabhängig —
    // sonst hinge es daran, welcher Planer zuerst gemeldet hat.
    const a = fuehreKommentareZusammen([mk('1', true)], [mk('1')])
    const b = fuehreKommentareZusammen([mk('1')], [mk('1', true)])
    expect(a[0]!.erledigt).toBe(true)
    expect(b[0]!.erledigt).toBe(true)
    expect(a).toEqual(b)
  })
})

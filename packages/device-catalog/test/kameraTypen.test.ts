// ───────────────────────────────────────────────────────────────────────────
// Befund A aus `docs/adr-stand.md`, gegen den echten Katalog gerechnet.
//
// Die Zahlen standen als Prosa in einem Papier. Ein Befund, den nichts
// nachrechnet, altert wie jede andere Behauptung — und dieser hier ist der
// Grund, aus dem es das Paket gibt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { KAMERA_TYPEN, fuehreZusammen, istAbgeleitet, ohneBeleg } from '../src/index'

describe('Kameratypen — Befund A, nachgerechnet', () => {
  it('die Kameraliste der Suite steht vollständig im Katalog', () => {
    expect(KAMERA_TYPEN).toHaveLength(377)
    // ZWÖLF tragen die Id des gleichnamigen Cable-Eintrags. Neun davon hat
    // jemand von Hand gepflegt („gesetzt für Modelle, deren echte I/O im
    // Cable-Planner-Katalog hinterlegt ist"), drei wurden dabei übersehen und
    // fielen dem Wächter „kein Modell steht unter zwei Ids" auf — sie hätten
    // sonst doppelt im Katalog gestanden, einmal mit Ports und einmal ohne.
    //
    // Am 2026-09-25 kamen VIER dazu (multicam#148): Blackmagic-Modelle, die
    // der Katalog-Abzug nicht fand, weil der Cable-Planer sie unter dem
    // vollen Namen fuehrt („Pocket Cinema Camera 6K G2" gegen „Pocket Cinema
    // 6K G2"). Von Hand und mit Datenblatt-Nummer zugeordnet, also sechzehn.
    //
    // Die übrigen 361 haben im Cable-Planer keine Entsprechung. Das war der
    // Befund: sie gab es dort gar nicht.
    expect(KAMERA_TYPEN.filter((t) => !istAbgeleitet(t.id))).toHaveLength(16)
    expect(KAMERA_TYPEN.filter((t) => istAbgeleitet(t.id))).toHaveLength(361)
  })

  it('und sie bringt ihre Datenblätter mit', () => {
    const { typen } = fuehreZusammen([{ name: 'multicam', eintraege: KAMERA_TYPEN }])
    // 372 von 377 tragen einen Herstellerlink. Die fünf ohne sind eine
    // AUSSAGE und kein Schweigen — sie fallen hier auf, statt später im Plan
    // wie ein belegter Eintrag auszusehen.
    expect(ohneBeleg(typen)).toHaveLength(5)
    expect(typen.length - ohneBeleg(typen).length).toBe(372)
  })

  it('jede Id kommt genau einmal vor', () => {
    // Zwei Zeilen unter einer Id wären zwei Geräte, die als eines gelten —
    // der teuerste Fehler, den eine Identität machen kann.
    const ids = KAMERA_TYPEN.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('und das Zusammenführen meldet keinen Widerspruch mit sich selbst', () => {
    const einmal = { name: 'multicam', eintraege: KAMERA_TYPEN }
    const { typen, befunde } = fuehreZusammen([einmal, einmal])
    expect(befunde).toEqual([])
    expect(typen).toHaveLength(377)
    expect(typen[0].quellen).toEqual(['multicam', 'multicam'])
  })
})

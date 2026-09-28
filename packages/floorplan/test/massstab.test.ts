import { describe, expect, it } from 'vitest'
import {
  abbilden,
  eckenGueltig,
  homographie,
  kalibrierungMitfuehren,
  meterAbbildung,
  meterJePixel,
  wegLaengeM,
  type PlanKalibrierung,
} from '../src/index'

// Uebernommen aus cable-planner tests/grundriss.test.ts, wo die Rechnung
// herkommt. Dort bleiben die Tests, die cable-eigene Teile pruefen
// (Kabelweg, Venue-Umrechnung des cable-Modells).
describe('Massstab — zwei Punkte', () => {
  it('rechnet eine Strecke bekannter Laenge in Meter je Pixel um', () => {
    const k: PlanKalibrierung = { art: 'zweiPunkt', a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, meter: 10 }
    expect(meterJePixel(k)).toBeCloseTo(0.05)
    const m = meterAbbildung(k)!
    expect(wegLaengeM(m, [{ x: 0, y: 0 }, { x: 0, y: 400 }])).toBeCloseTo(20)
  })

  it('verweigert eine Strecke ohne Laenge', () => {
    expect(meterAbbildung({ art: 'zweiPunkt', a: { x: 5, y: 5 }, b: { x: 5, y: 5 }, meter: 10 })).toBeNull()
  })
})

describe('Massstab — vier Ecken (Perspektive)', () => {
  // Ein 20 × 10 m grosser Boden, schraeg fotografiert: die hintere Kante
  // (oben im Bild) ist kuerzer als die vordere.
  const ecken: [any, any, any, any] = [
    { x: 300, y: 100 },
    { x: 700, y: 100 },
    { x: 900, y: 500 },
    { x: 100, y: 500 },
  ]
  const k: PlanKalibrierung = { art: 'rechteck', ecken, breiteM: 20, tiefeM: 10 }

  it('bildet die Ecken auf die Masse der Flaeche ab', () => {
    const m = meterAbbildung(k)!
    expect(m(ecken[0])).toEqual({ x: expect.closeTo(0, 6), y: expect.closeTo(0, 6) })
    expect(m(ecken[2])).toEqual({ x: expect.closeTo(20, 6), y: expect.closeTo(10, 6) })
  })

  it('misst hinten und vorne dieselbe Breite, obwohl das Bild sie verschieden lang zeigt', () => {
    const m = meterAbbildung(k)!
    expect(wegLaengeM(m, [ecken[0], ecken[1]])).toBeCloseTo(20, 6)
    expect(wegLaengeM(m, [ecken[3], ecken[2]])).toBeCloseTo(20, 6)
    expect(Math.hypot(ecken[1].x - ecken[0].x, 0)).not.toBe(Math.hypot(ecken[2].x - ecken[3].x, 0))
  })

  it('misst die Diagonale nach Pythagoras', () => {
    const m = meterAbbildung(k)!
    expect(wegLaengeM(m, [ecken[0], ecken[2]])).toBeCloseTo(Math.hypot(20, 10), 6)
  })

  it('lehnt vertauschte Ecken ab (ein „Z" klappte den Plan um)', () => {
    expect(eckenGueltig([ecken[0], ecken[2], ecken[1], ecken[3]])).toBe(false)
    expect(meterAbbildung({ ...k, ecken: [ecken[0], ecken[2], ecken[1], ecken[3]] })).toBeNull()
  })

  it('liefert hinter dem Horizont keine Zahl', () => {
    const h = homographie(ecken, [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ])!
    // Die Seitenkanten laufen oben bei y = −100 zusammen: dort ist der Horizont.
    expect(abbilden(h, { x: 500, y: -300 })).toBeNull()
  })

  it('fuehrt die Kalibrierung mit, wenn der Plan verschoben und skaliert wird', () => {
    const alt = { x: 0, y: 0, width: 1000, height: 600 }
    const neu = { x: 50, y: 20, width: 2000, height: 1200 }
    const k2 = kalibrierungMitfuehren(k, alt, neu)
    const vorher = wegLaengeM(meterAbbildung(k)!, [ecken[0], ecken[2]])!
    const f = (p: { x: number; y: number }) => ({ x: 50 + p.x * 2, y: 20 + p.y * 2 })
    expect(wegLaengeM(meterAbbildung(k2)!, [f(ecken[0]), f(ecken[2])])).toBeCloseTo(vorher, 6)
  })
})


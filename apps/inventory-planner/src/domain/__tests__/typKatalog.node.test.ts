// ───────────────────────────────────────────────────────────────────────────
// Die gemeinsame Basis am Lager (ADR-012).
//
// Der Eigentümer, 2026-09-19: „Inventory planner und der ganze Rest hat aber
// noch eigene Listen. Ausnahmslos alles soll sich die gleiche Basis teilen!"
//
// Das Lager hatte die dünnste Liste von allen: gar keine. Ein Artikel entstand
// aus einem getippten Namen, `deviceTypeId` blieb leer, und `deckungAusBestand`
// fiel damit immer auf den Namensvergleich zurück, den es selbst als die
// schlechtere Auskunft führt.
// ───────────────────────────────────────────────────────────────────────────
import { afterEach, describe, expect, it } from 'vitest'
import {
  registriereTypKatalog,
  typFuerEingabe,
  typLabel,
  typVorschlaege,
  vergissTypKatalog,
} from '../../lib/typKatalog'

const KATALOG = [
  { id: 'typ-fx9', hersteller: 'Sony', modell: 'PXW-FX9', kategorie: 'Cameras' },
  { id: 'typ-atem', modell: 'ATEM Constellation 8K', kategorie: 'Video Mixer' },
  { id: 'typ-mini-a', hersteller: 'A', modell: 'Mini', kategorie: 'Video' },
  { id: 'typ-mini-b', hersteller: 'B', modell: 'Mini', kategorie: 'Video' },
]

afterEach(() => vergissTypKatalog())

describe('typKatalog — Anschluss statt Abhängigkeit', () => {
  it('ohne angemeldete Quelle ist die Liste leer und niemand rät', () => {
    // Das ist der Standalone-Betrieb: ein Lager ohne Katalog HAT keinen.
    expect(typVorschlaege()).toEqual([])
    expect(typFuerEingabe('Sony PXW-FX9')).toBeNull()
  })

  it('trifft auf den vollen Namen und auf das Modell allein', () => {
    registriereTypKatalog(() => KATALOG)
    expect(typFuerEingabe('Sony PXW-FX9')?.id).toBe('typ-fx9')
    expect(typFuerEingabe('PXW-FX9')?.id).toBe('typ-fx9')
    expect(typFuerEingabe('  sony pxw-fx9 ')?.id).toBe('typ-fx9')
  })

  it('trifft NICHT, wo zwei Typen denselben Modellnamen tragen', () => {
    // Eine geratene Id sähe hinterher aus wie eine Tatsache und würde nie
    // wieder hinterfragt (ADR-002).
    registriereTypKatalog(() => KATALOG)
    expect(typFuerEingabe('Mini')).toBeNull()
    expect(typFuerEingabe('A Mini')?.id).toBe('typ-mini-a')
  })

  it('trifft nicht auf einen Teil des Namens', () => {
    registriereTypKatalog(() => KATALOG)
    expect(typFuerEingabe('Sony')).toBeNull()
    expect(typFuerEingabe('FX9')).toBeNull()
  })

  it('der Anzeigename nennt den Hersteller, wo die Quelle ihn führt', () => {
    expect(typLabel(KATALOG[0])).toBe('Sony PXW-FX9')
    // Und erfindet ihn nicht, wo sie es nicht tut — im Cable-Katalog steckt
    // er im Modellnamen, und ihn herauszuschneiden wäre Raten.
    expect(typLabel(KATALOG[1])).toBe('ATEM Constellation 8K')
  })
})

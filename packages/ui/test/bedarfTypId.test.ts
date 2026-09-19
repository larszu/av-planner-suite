// ───────────────────────────────────────────────────────────────────────────
// Der Bedarf schluesselt ueber die KATALOG-IDENTITAET (ADR-012).
//
// Der Schaden, gegen den das steht, ist eine Bestellung: bis 2026-09-19 war
// der Schluessel `modell.toLowerCase()`. Dieselbe Kamera hiess im Kameraplan
// „Sony FX9" und im Katalog des Cable-Planers „Sony PXW-FX9" — zwei Zeilen,
// zwei Lagerpositionen, und das Haus haette zwei Bleche geordert.
//
// Es ist derselbe Namensvergleich, den ADR-002 verbietet, nur eine Ebene
// weiter hinten: dort, wo aus dem Plan eine Bestellung wird.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { deriveBedarf } from '../src/seed'

describe('deriveBedarf — die Id schlaegt den Namen', () => {
  it('fasst zwei Schreibweisen desselben Typs zu EINER Zeile zusammen', () => {
    const b = deriveBedarf({
      geraete: [
        { id: 'k1', name: 'CAM 1', kategorie: 'Cameras', model: 'Sony FX9', typId: 'typ-fx9' },
        { id: 'n1', name: 'CAM 1 (Signalweg)', model: 'Sony PXW-FX9', typId: 'typ-fx9' },
      ],
    })
    expect(b).toHaveLength(1)
    expect(b[0].quantity).toBe(2)
    expect(b[0].key).toBe('typ-fx9')
    expect(b[0].deviceTypeId).toBe('typ-fx9')
  })

  it('trennt zwei VERSCHIEDENE Typen, auch wenn sie gleich heissen', () => {
    // Die Gegenrichtung desselben Fehlers. Zwei Hersteller nennen ihr Geraet
    // „Mini"; der Name sagt nicht, dass es dasselbe ist, die Id sagt, dass es
    // das nicht ist.
    const b = deriveBedarf({
      geraete: [
        { id: 'a', name: 'A', model: 'Mini', typId: 'typ-a' },
        { id: 'b', name: 'B', model: 'Mini', typId: 'typ-b' },
      ],
    })
    expect(b.map((z) => z.key).sort()).toEqual(['typ-a', 'typ-b'])
  })

  it('faellt ohne Id auf den Modellnamen zurueck, statt nichts zu koennen', () => {
    // Ein von Hand angelegtes Geraet hat keine Katalog-Id. Zwei gleich
    // benannte sind dann immer noch dasselbe Modell — was NICHT passiert,
    // ist die Gegenrichtung: aus einem Namen wird nie eine Id gemacht.
    const b = deriveBedarf({
      geraete: [
        { id: 'a', name: 'A', model: 'Eigenbau X' },
        { id: 'b', name: 'B', model: 'Eigenbau X' },
      ],
    })
    expect(b).toHaveLength(1)
    expect(b[0].key).toBe('eigenbau x')
    expect(b[0].deviceTypeId).toBeUndefined()
  })

  it('mischt beide Wege, ohne sie zu verwechseln', () => {
    const b = deriveBedarf({
      geraete: [
        { id: 'a', name: 'A', model: 'Sony FX9', typId: 'typ-fx9' },
        { id: 'b', name: 'B', model: 'Sony FX9' },
      ],
    })
    // Zwei Zeilen: die eine ist eine Tatsache, die andere eine Namensgleichheit.
    // Sie zusammenzuziehen hiesse zu behaupten, das handgelegte Geraet sei
    // dieses Katalog-Modell — das hat niemand gesagt.
    expect(b.map((z) => z.key).sort()).toEqual(['sony fx9', 'typ-fx9'])
  })
})

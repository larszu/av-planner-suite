// ───────────────────────────────────────────────────────────────────────────
// Der zusammengeführte Katalog — Befund A, vollständig nachgerechnet.
//
// Die Zahlen aus `docs/adr-stand.md` standen als Prosa. Hier rechnet sie der
// Baum: wer morgen einen Katalog ergänzt, ändert sie, und diese Datei sagt es.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  CABLE_TYPEN,
  KAMERA_TYPEN,
  alleTypen,
  istAbgeleitet,
  katalog,
  mehrfachGefuehrt,
  ohneBeleg,
  typFuer,
  typenDerKategorie,
} from '../src/index'

describe('Der Katalog der Suite', () => {
  it('führt jedes Modell genau einmal', () => {
    const ids = alleTypen().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    // 467 aus dem Cable-Planer + 377 Kameras − die gemeinsamen.
    const gemeinsam = mehrfachGefuehrt(alleTypen())
    expect(alleTypen()).toHaveLength(CABLE_TYPEN.length + KAMERA_TYPEN.length - gemeinsam.length)
  })

  it('und die 9 gemeinsamen sind genau die mit gewachsener Id', () => {
    // Das war Befund A in einer Zahl: von 377 Kameramodellen der Suite hatten
    // NEUN im Cable-Planer eine Identität. Die übrigen 368 gab es dort nicht.
    const gemeinsam = mehrfachGefuehrt(alleTypen())
    expect(gemeinsam).toHaveLength(9)
    for (const t of gemeinsam) {
      expect(t.quellen).toEqual(['cable', 'multicam'])
      expect(istAbgeleitet(t.id)).toBe(false)
    }
  })

  it('der Cable-Planer kennt jetzt alle Kameramodelle', () => {
    // Die Zahl, um die es dem Eigentümer ging: vorher 23 Kameraeinträge im
    // Cable-Katalog, jetzt sieht er dieselbe Liste wie der Kameraplan.
    expect(typenDerKategorie('Cameras').length).toBeGreaterThanOrEqual(377)
  })

  it('löst zwei Schreibweisen auf und meldet, was eine Entscheidung braucht', () => {
    const befunde = katalog().befunde
    // Am 2026-09-19 sind es NEUN, und jeder ist echt. Zwölf weitere waren es
    // vorher und waren keine: „Sony PMW-F5" in einem Feld gegen
    // `manufacturer: 'Sony'` + `model: 'PMW-F5'` ist dieselbe Angabe in zwei
    // Auflösungen, und ADR-005 Regel 2 entscheidet sie ohne Befund — die
    // höhere gewinnt. Ein Befundhaufen aus Nicht-Befunden ist die Sorte
    // Meldung, die nach dem dritten Mal niemand mehr liest.
    expect(befunde).toHaveLength(9)

    // Fünfmal nennen die Kataloge verschiedene Herstellerseiten für dasselbe
    // Gerät (US gegen Europa/Asien). Das ist keine Schreibweise, das ist die
    // Frage, welche Seite gilt — und die beantwortet ein Mensch.
    expect(befunde.filter((b) => b.feld === 'datenblattUrl')).toHaveLength(5)

    // Viermal heisst dasselbe Modell wirklich verschieden („Canon EOS C70"
    // gegen „C70", „PXW-FS7 Mk II" gegen „PXW-FS7 II"). Kein reines
    // Hersteller-Präfix — deshalb wird hier NICHT automatisch aufgelöst.
    expect(befunde.filter((b) => b.feld === 'modell')).toHaveLength(4)

    // Und jeder Befund nennt beide Werte und beide Quellen, sonst wäre er
    // nicht bearbeitbar.
    for (const b of befunde) {
      expect(b.gehalten.quelle).toBe('cable')
      expect(b.abweichend.quelle).toBe('multicam')
      expect(b.gehalten.wert).not.toBe(b.abweichend.wert)
    }
  })

  it('die feinere Auflösung zieht ein, wo sie dieselbe Angabe ist', () => {
    // Das Gegenstück zum Test darüber: wo der Hersteller nur in EINER Quelle
    // getrennt steht, übernimmt der Katalog ihn — er beantwortet eine Frage,
    // die die andere Schreibweise nicht beantwortet.
    const f5 = alleTypen().find((t) => t.modell === 'PMW-F5')
    expect(f5, 'Sony PMW-F5 sollte in der feineren Schreibweise stehen').toBeDefined()
    expect(f5!.hersteller).toBe('Sony')
    expect(f5!.quellen).toEqual(['cable', 'multicam'])
  })

  it('„kein Datenblatt" ist eine Aussage und wird gezählt', () => {
    const ohne = ohneBeleg(alleTypen())
    expect(ohne.length).toBe(50)
    // 45 aus dem Cable-Planer (467 − 422) und 5 aus der Kameraliste.
    expect(ohne.filter((t) => t.quellen.includes('cable'))).toHaveLength(45)
  })

  it('eine unbekannte Id ist eine Auskunft, kein nächstbester Treffer', () => {
    expect(typFuer('gibt-es-nicht')).toBeNull()
    expect(typFuer(undefined)).toBeNull()
    expect(typFuer(alleTypen()[0].id)).toEqual(alleTypen()[0])
  })
})

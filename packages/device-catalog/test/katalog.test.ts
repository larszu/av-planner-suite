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
  LICHT_TYPEN,
  alleTypen,
  istAbgeleitet,
  katalog,
  normalisiere,
  mehrfachGefuehrt,
  ohneBeleg,
  typFuer,
  typenDerKategorie,
} from '../src/index'

describe('Der Katalog der Suite', () => {
  it('führt jedes Modell genau einmal', () => {
    const ids = alleTypen().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    // 467 aus dem Cable-Planer + 377 Kameras + 84 Leuchten − die gemeinsamen.
    const gemeinsam = mehrfachGefuehrt(alleTypen())
    expect(alleTypen()).toHaveLength(
      CABLE_TYPEN.length + KAMERA_TYPEN.length + LICHT_TYPEN.length - gemeinsam.length,
    )
  })

  it('und die 12 gemeinsamen sind genau die mit gewachsener Id', () => {
    // Befund A in einer Zahl: von 377 Kameramodellen der Suite haben ZWÖLF im
    // Cable-Planer eine Identität — neun von Hand gepflegt, drei vom Wächter
    // „kein Modell steht unter zwei Ids" nachgezogen. Die übrigen 365 gab es
    // dort nicht.
    const gemeinsam = mehrfachGefuehrt(alleTypen())
    expect(gemeinsam).toHaveLength(12)
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
    // Am 2026-09-19 sind es ELF, und jeder ist echt. Zwölf weitere waren es
    // vorher und waren keine: „Sony PMW-F5" in einem Feld gegen
    // `manufacturer: 'Sony'` + `model: 'PMW-F5'` ist dieselbe Angabe in zwei
    // Auflösungen, und ADR-005 Regel 2 entscheidet sie ohne Befund — die
    // höhere gewinnt. Ein Befundhaufen aus Nicht-Befunden ist die Sorte
    // Meldung, die nach dem dritten Mal niemand mehr liest.
    expect(befunde).toHaveLength(11)

    // Siebenmal nennen die Kataloge verschiedene Herstellerseiten für dasselbe
    // Gerät (US gegen Europa/Asien). Das ist keine Schreibweise, das ist die
    // Frage, welche Seite gilt — und die beantwortet ein Mensch.
    expect(befunde.filter((b) => b.feld === 'datenblattUrl')).toHaveLength(7)

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
    expect(ohne.length).toBe(134)
    // 45 aus dem Cable-Planer (467 − 422) und 5 aus der Kameraliste.
    expect(ohne.filter((t) => t.quellen.includes('cable'))).toHaveLength(45)

    // UND 84 AUS DEM LICHT-PLANER — seine ganze Fixture-Bibliothek. Sie führt
    // keinen einzigen Herstellerlink; die Photometrie steht teils als
    // gemessener Wert im Kommentar, aber nichts davon ist eine Fundstelle.
    //
    // Das ist der Befund, nicht der Fehler dieses Tests: die Zahl steht hier,
    // damit sie jemand senken kann. Sie zu verstecken machte aus einem
    // bekannten Loch ein unbekanntes.
    expect(ohne.filter((t) => t.quellen.includes('light'))).toHaveLength(84)
  })

  it('die Leuchten des Licht-Planers stehen im Katalog', () => {
    // Das Gegenstück zur Kamera-Zeile: eine im Licht-Planer gepflegte Leuchte
    // ist jetzt auch im Signalplan ein bekanntes Modell — sie hängt schliesslich
    // an einem Kabel.
    expect(typenDerKategorie('Lights')).toHaveLength(84)
    const s4 = alleTypen().find((t) => t.modell === 'Source Four 19°')
    expect(s4, 'Source Four 19° sollte im Katalog stehen').toBeDefined()
    expect(s4!.hersteller).toBe('ETC')
    expect(s4!.quellen).toEqual(['light'])
  })

  it('kein Modell steht unter zwei Ids', () => {
    // GEFUNDEN AM 2026-09-19, bevor es jemand im Plan bemerkt hätte. Drei
    // Modelle standen doppelt: Blackmagic Studio Camera 4K Pro G2, URSA Mini
    // Pro 12K, Sony PXW-Z280. Die Kameraliste pflegt `deviceTypeId` von Hand
    // („gesetzt für Modelle, deren echte I/O im Cable-Planner-Katalog
    // hinterlegt ist") — bei neun ist das geschehen, diese drei wurden
    // übersehen, und der Erzeuger leitete ihnen eine eigene Id ab.
    //
    // Die Folge wäre still gewesen: `katalogTemplate` raten bei
    // Mehrdeutigkeit bewusst NICHT, also hätte ein Gerät dieses Modells beim
    // nächsten Seed seine Anschlüsse verloren.
    // DIESELBE Normalisierung wie die Id-Vergabe, nicht eine nachgebaute:
    // eine eigene hier war der Grund, warum dieser Wächter „Atomos Ninja V+"
    // und „Atomos Ninja V" für dasselbe Gerät hielt. Ein Wächter, der anders
    // rechnet als das, was er bewacht, misst etwas anderes.
    const norm = normalisiere
    const jeName = new Map<string, string[]>()
    for (const t of alleTypen()) {
      const k = norm(t.hersteller ? `${t.hersteller} ${t.modell}` : t.modell)
      jeName.set(k, [...(jeName.get(k) ?? []), t.id])
    }
    const doppelt = [...jeName.entries()].filter(([, ids]) => ids.length > 1)
    expect(doppelt, `Modelle unter mehreren Ids: ${JSON.stringify(doppelt)}`).toEqual([])
  })

  it('eine unbekannte Id ist eine Auskunft, kein nächstbester Treffer', () => {
    expect(typFuer('gibt-es-nicht')).toBeNull()
    expect(typFuer(undefined)).toBeNull()
    expect(typFuer(alleTypen()[0].id)).toEqual(alleTypen()[0])
  })
})

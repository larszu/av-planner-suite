// ───────────────────────────────────────────────────────────────────────────
// Der Gerätetyp — EINE Identität für ein Modell, über alle Planer.
//
// ─── WARUM ES DIESES PAKET GIBT ────────────────────────────────────────────
//
// ADR-002 führt eine Eigentumstabelle, und ihre erste Zeile lautet:
// „Gerätetyp (Katalog) besitzt das Datenblatt: Ports, Maße, Leistung,
// Hersteller, Modellname." Genau EIN Eigentümer — das ist der Sinn der
// Tabelle.
//
// Gemessen am 2026-09-19 hatte dieses Feld DREI Eigentümer:
// `multicam-planner/src/data/cameras.ts` führt 377 Kameramodelle mit
// Datenblatt-Link, `cable-planner/src/renderer/lib/cameraCatalog.ts` 23 —
// und genau **9** teilen sich eine `deviceTypeId`. 368 von 377 Kameramodellen
// der Suite haben im Cable-Planer keine Identität.
//
// ADR-006 hatte das Paket vertagt, mit der Bedingung: „lohnt erst, wenn ein
// zweiter Planer sie schreibt statt nur liest." Die Bedingung unterstellte,
// dass die anderen Planer den Katalog des Cable-Planers LESEN. Sie taten es
// nie — sie haben eigene gebaut. Die Vertagung war also nie eine Vertagung,
// sondern die Beschreibung eines Zustands, der schon gegen ADR-002 stand
// (`docs/adr-stand.md`, Befund A).
//
// ─── WO DER SCHNITT LIEGT, UND WARUM GENAU DORT ────────────────────────────
//
// Dieses Paket führt die IDENTITÄT eines Modells und die Angaben, die JEDER
// Planer gleich versteht: Hersteller, Modell, Kategorie, Datenblatt.
//
// Es führt NICHT die fachlichen Fakten — Ports und Steckertypen, Sensorgröße
// und Bajonett, DMX-Modi. Die gehören dem Planer, der sie versteht, und zwar
// aus einem harten Grund: ein Paket, das Ports führt, müsste `ConnectorType`,
// `Port`, `SignalStandard` und den halben Kabelgraph mitziehen — und dann
// wäre es kein Katalog mehr, sondern der Cable-Planer mit anderem Namen.
//
// Derselbe Schnitt wie bei ADR-011 eine Ebene tiefer: gemeinsame Felder oben,
// fachliche Gruppen bei dem, der sie führt, und EINE Id, an der alles hängt.
//
// ─── WAS DAS SOFORT ÄNDERT ─────────────────────────────────────────────────
//
// Der Cable-Planer kennt ab jetzt alle 377 Kameramodelle als TYPEN — mit
// Hersteller, Modell und Datenblatt-Link. Ports hat er für 368 davon nicht,
// und er erfindet sie nicht: sie kommen als `portsUnknown` in den Plan, das
// ist der Mechanismus, den dieses Repo dafür schon hat. „Kein Datenblatt für
// die Ports" ist eine Auskunft; „dieses Modell gibt es nicht" war eine
// Falschaussage.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ein Gerätemodell, wie ALLE Planer es kennen.
 *
 * Die Instanz im Plan („Kamera 1") ist etwas anderes — sie hat eine eigene
 * Id und zeigt über `deviceTypeId` hierher (ADR-002).
 */
export interface Geraetetyp {
  /**
   * Stabile, opake Modell-Identität (GDTF/DIN-SPEC-15800-analog:
   * FixtureTypeID). Versionsstabil und nie aus dem Namen gerechnet, wo eine
   * gewachsene Id existiert — siehe `identitaet.ts`.
   */
  id: string
  /**
   * Der Hersteller — OPTIONAL, weil ihn nicht jede Quelle getrennt führt.
   *
   * Die Kameraliste des MultiCam-Planers tut es (`manufacturer` + `model`).
   * Die Katalog-Einträge des Cable-Planers nicht: dort steht „AJA KUMO
   * 1616-12G" in EINEM Feld. Das auseinanderzuschneiden wäre Raten an genau
   * der Stelle, an der ADR-002 es verbietet — „Blackmagic Design ATEM Mini"
   * und „ATEM Mini" trennen sich nicht nach derselben Regel wie „AJA KUMO",
   * und ein Fehlschnitt erzeugte zwei Hersteller, die es nicht gibt.
   *
   * Es fehlt also, weil die Quelle es nicht sagt, und nicht, weil der
   * Hersteller unbekannt wäre. Für die Id ist das folgenlos: jeder der 467
   * Cable-Einträge trägt eine gewachsene `deviceTypeId`, es muss dort also
   * nichts abgeleitet werden.
   */
  hersteller?: string
  /** Das Modell, wie die Quelle es führt — bei manchen Quellen mit Hersteller darin. */
  modell: string
  /**
   * Die Kategorie, die das Modell den Plänen zuordnet („Cameras", „Video
   * Mixer", „Licht"). Dieselbe Tabelle wie in `@avplan/ui` (ADR-011)
   * entscheidet, welcher Plan es zeigt — hier steht nur, was der Katalog sagt.
   */
  kategorie: string
  /**
   * Die Fundstelle beim Hersteller.
   *
   * Optional, und das Fehlen ist eine AUSSAGE: dieser Eintrag trägt keinen
   * Beleg. `catalogueEvidence` im Cable-Planer rechnet damit die Abdeckung —
   * ein Beleg-Anspruch, den nichts nachrechnet, ist eine Behauptung.
   */
  datenblattUrl?: string
  /**
   * Woher dieser Eintrag stammt (`'cable'`, `'multicam'`, `'light'`).
   *
   * Steht hier, weil das Zusammenführen sonst nicht prüfbar wäre: bei zwei
   * Einträgen für dieselbe Id muss ein Befund sagen KÖNNEN, welche Quellen
   * sich widersprechen. Ohne die Herkunft hiesse der Befund „irgendwo".
   */
  quellen: readonly string[]
  /**
   * Wie die QUELLE diesen Typ bei sich nennt — Quellenname auf deren eigene Id.
   *
   * WARUM DIE RUECKRICHTUNG UEBERHAUPT GEBRAUCHT WIRD (2026-09-19, ADR-012).
   * Jede Liste hat eine eigene Id: die Kameraliste `sony-hdc-3500`, die
   * Leuchten-Bibliothek `etc-s4-19`, die Katalogdateien des Cable-Planers eine
   * GUID. Der Katalog rechnet daraus EINE Identitaet — aber ein Planer, der
   * seinen eigenen Eintrag in der Hand haelt, konnte bis hierher nicht fragen,
   * welcher Katalog-Typ das ist, ohne den Namen zu vergleichen. Ein
   * Namensvergleich ist genau das, was ADR-002 verbietet.
   *
   * Steht hier und nicht in der Quellliste, weil es GERECHNET ist: der
   * Generator kennt beide Seiten, ein von Hand gepflegtes Feld in 928
   * Eintraegen driftet.
   */
  refs?: Readonly<Record<string, string>>
}

/** Ein Eintrag, wie ihn eine Quelle liefert — ohne Herkunft, die setzt der Merge. */
export type TypEingabe = Omit<Geraetetyp, 'quellen' | 'refs'> & {
  /** Die Id, unter der die Quelle diesen Typ fuehrt. Der Merge macht daraus `refs`. */
  quellRef?: string
}

/** Eine benannte Katalog-Quelle. */
export interface TypQuelle {
  name: string
  eintraege: readonly TypEingabe[]
}

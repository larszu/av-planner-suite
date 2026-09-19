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
  hersteller: string
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
}

/** Ein Eintrag, wie ihn eine Quelle liefert — ohne Herkunft, die setzt der Merge. */
export type TypEingabe = Omit<Geraetetyp, 'quellen'>

/** Eine benannte Katalog-Quelle. */
export interface TypQuelle {
  name: string
  eintraege: readonly TypEingabe[]
}

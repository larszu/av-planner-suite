// ───────────────────────────────────────────────────────────────────────────
// Die gemeinsame Basis der Gerätetypen — als ANSCHLUSS, nicht als Abhängigkeit.
//
// WARUM ES DAS GIBT (ADR-012, 2026-09-19). Der Eigentümer: „Inventory planner
// und der ganze Rest hat aber noch eigene Listen. Ausnahmslos alles soll sich
// die gleiche Basis teilen!"
//
// Das Lager hatte hier die dünnste Liste von allen: gar keine. Ein Artikel
// entstand aus einem getippten Modellnamen, und `deviceTypeId` — das Feld,
// über das `deckungAusBestand` eine Plan-Zeile auf eine Lagerposition
// abbildet — blieb leer. Die Deckung fiel damit IMMER auf den
// Namensvergleich zurück, den sie ausdrücklich als die schlechtere Auskunft
// führt.
//
// WARUM EIN ANSCHLUSS UND KEIN IMPORT. Dieses Repo läuft in zwei Fassungen:
// eingebettet in der Suite, wo `@avplan/device-catalog` danebenliegt, und
// als eigene App, wo es das nicht tut. Ein fester Import machte die zweite
// Fassung unbaubar — dieselbe Lage, aus der `connectShellSeed` ein
// Suite-Overlay ist und kein Kern.
//
// Ohne angemeldete Quelle ist die Liste LEER, und das ist die ehrliche
// Aussage: ein Lager ohne Katalog hat keinen. Es rät dann nichts und
// verhält sich wie bisher.
// ───────────────────────────────────────────────────────────────────────────

/** Ein Gerätetyp, so wenig wie das Lager davon braucht. */
export interface TypVorschlag {
  /** Die geteilte Identität — landet als `deviceTypeId` am Artikel. */
  id: string
  hersteller?: string
  modell: string
  kategorie: string
}

let quelle: (() => readonly TypVorschlag[]) | null = null

/**
 * Den gemeinsamen Katalog anmelden. Ruft die Suite beim Start auf.
 *
 * Eine FUNKTION und keine Liste: der Katalog wird beim ersten Zugriff
 * gerechnet, und ein Aufruf beim Start zöge ihn in jeden Ladevorgang.
 */
export function registriereTypKatalog(fn: () => readonly TypVorschlag[]): void {
  quelle = fn
}

/** Nur für Tests: den angemeldeten Katalog wieder abmelden. */
export function vergissTypKatalog(): void {
  quelle = null
}

/** Alle bekannten Gerätetypen — leer, solange keiner angemeldet ist. */
export const typVorschlaege = (): readonly TypVorschlag[] => quelle?.() ?? []

/** Der Anzeigename eines Typs: Hersteller und Modell, wie der Katalog sie führt. */
export const typLabel = (t: TypVorschlag): string =>
  t.hersteller ? `${t.hersteller} ${t.modell}` : t.modell

/**
 * Der Typ zu einer EINGABE — oder `null`.
 *
 * Getroffen wird auf den vollen Anzeigenamen oder auf das Modell allein, und
 * nur EINDEUTIG: treffen zwei, ist das Ergebnis `null`. Ein geratener Treffer
 * schriebe eine Identität an einen Artikel, die niemand behauptet hat — und
 * die danach nie wieder hinterfragt wird, weil eine Id wie eine Tatsache
 * aussieht (ADR-002).
 */
export function typFuerEingabe(eingabe: string): TypVorschlag | null {
  const gesucht = eingabe.trim().toLowerCase()
  if (!gesucht) return null
  const treffer = typVorschlaege().filter(
    (t) => typLabel(t).toLowerCase() === gesucht || t.modell.toLowerCase() === gesucht,
  )
  return treffer.length === 1 ? treffer[0] : null
}

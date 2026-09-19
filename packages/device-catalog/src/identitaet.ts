// ───────────────────────────────────────────────────────────────────────────
// Die Id eines Gerätetyps — gewachsen, wo es eine gibt, sonst abgeleitet.
//
// ─── DIE REGEL, UND WARUM SIE IN DIESER RICHTUNG GILT ──────────────────────
//
// Eine bestehende `deviceTypeId` GEWINNT immer. Sie steht in Projektdateien,
// in Lagerpositionen (`InventoryItem.deviceTypeId`, ADR-002) und in
// exportierten Kameralisten. Sie neu zu rechnen hiesse, in jedem
// gespeicherten Projekt die Zuordnung zu kappen — still, und erst beim
// nächsten Öffnen sichtbar.
//
// Wo keine existiert, wird eine ABGELEITET und nicht gezogen. Eine laufende
// Nummer wäre von der Reihenfolge des Katalogs abhängig: eine eingefügte
// Zeile verschöbe alle darunter, und dieselbe Kamera hiesse morgen anders.
// Abgeleitet aus Hersteller und Modell ergibt derselbe Katalog zweimal
// dieselben Ids — auch in zwei Repos, die die Datei getrennt vendorieren.
//
// ─── WAS DIE ABGELEITETE ID IST UND WAS NICHT ──────────────────────────────
//
// Sie ist eine IDENTITÄT, keine Aussage über das Gerät. Sie behauptet nicht,
// dass ein Datenblatt vorliegt; das sagt `datenblattUrl`. Sie trägt deshalb
// das Präfix `abgeleitet:`, damit man ihr ansieht, woher sie kommt — eine Id,
// die aussieht wie eine gewachsene GUID, würde später niemand mehr von einer
// unterscheiden.
//
// REIN: keine Datei, kein Netz, keine Uhr, kein Zufall.
// ───────────────────────────────────────────────────────────────────────────

/** Vergleichsform: Kleinbuchstaben, ein Leerzeichen, nichts als a–z0–9. */
export const normalisiere = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

/**
 * Die abgeleitete Id für ein Modell ohne gewachsene GUID.
 *
 * Hersteller UND Modell, weil das Modell allein nicht reicht: „HDC-3500" ist
 * eine Sony, aber „CM-1" gibt es bei mehreren Häusern. Wer nur das Modell
 * nähme, führte zwei verschiedene Geräte unter einer Id zusammen — und das
 * ist der Fehler, den eine Identität am teuersten macht.
 *
 * Eine Quelle ohne getrennten Hersteller kann diese Funktion deshalb nicht
 * benutzen. Das ist kein Loch: die Einträge des Cable-Planers tragen alle
 * eine gewachsene GUID, und wo weder das eine noch das andere vorliegt, soll
 * es auffallen statt still eine halbe Id zu erzeugen.
 */
export const abgeleiteteTypId = (hersteller: string, modell: string): string =>
  `abgeleitet:${normalisiere(hersteller).replace(/ /g, '-')}:${normalisiere(modell).replace(/ /g, '-')}`

/** Ist diese Id abgeleitet — also gerechnet und nicht gewachsen? */
export const istAbgeleitet = (id: string): boolean => id.startsWith('abgeleitet:')

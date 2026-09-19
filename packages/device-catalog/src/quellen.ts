// ───────────────────────────────────────────────────────────────────────────
// Die Quellen des Katalogs — und warum sie hier als DATEN stehen.
//
// Die Einträge werden von den Planern hereingereicht, nicht von hier
// importiert. Der Grund ist der Schnitt aus `typ.ts`: ein Paket, das die
// Katalogdateien des Cable-Planers importierte, zöge `EquipmentTemplate`,
// `Port`, `ConnectorType` und den halben Kabelgraph mit — und wäre dann kein
// Katalog mehr, sondern der Cable-Planer mit anderem Namen.
//
// Die REIHENFOLGE ist die Aussage: wer zuerst steht, hält ein Feld im
// Widerspruchsfall. Sie steht deshalb hier, benannt und begründet, und nicht
// verstreut an den Aufrufstellen.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Die Reihenfolge, in der Quellen ein Feld halten.
 *
 * `cable` zuerst, weil seine Einträge die GEWACHSENEN `deviceTypeId`s tragen
 * — dieselben, die in Projektdateien und Lagerpositionen stehen (ADR-002).
 * Wo beide etwas sagen, gewinnt also die Seite, an der die Identität hängt;
 * wo `cable` schweigt, zieht die Angabe der anderen ein, und genau das holt
 * die 368 Kameramodelle herüber.
 *
 * `multicam` vor `light`, ohne tieferen Grund als Stetigkeit: eine feste
 * Reihenfolge ist prüfbar, eine wechselnde nicht.
 */
export const QUELLEN_REIHENFOLGE = ['cable', 'multicam', 'light'] as const

export type QuellenName = (typeof QUELLEN_REIHENFOLGE)[number]

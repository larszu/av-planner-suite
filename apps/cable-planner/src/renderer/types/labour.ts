// ───────────────────────────────────────────────────────────────────────────
// Crew & Geld — die Domaene liegt jetzt in `@avplan/crew-core` (ADR-006).
//
// Diese Datei ist der Durchreicher, damit die 40+ Aufrufer im Planer nicht in
// einem Rutsch umgeschrieben werden mussten. Sie fuehrt NICHTS eigenes: jede
// Zeile, die hier entstuende, waere die zweite Wahrheit, gegen die ADR-001
// geschrieben ist.
//
// Der Umzug war moeglich, weil diese Datei KEINEN Import hatte — gemessen am
// 2026-09-19. Saetze, Stunden und Auslagen haben nie am Kabelgraph gehangen,
// und genau das sagt ADR-006 ueber diese Domaene.
// ───────────────────────────────────────────────────────────────────────────
export * from '@avplan/crew-core'

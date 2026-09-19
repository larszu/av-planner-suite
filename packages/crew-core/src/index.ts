// ───────────────────────────────────────────────────────────────────────────
// Crew & Geld — Saetze, Stunden, Buchungen, Auslagen, Belege.
//
// ─── WARUM ES DIESES PAKET GIBT ────────────────────────────────────────────
//
// ADR-006 teilt die Suite in Werkzeuge und sagt zu dieser Domaene: „eigenes
// Werkzeug — Saetze, Stunden, Auslagen und Belege gehoeren der Firma, nicht
// dem Plan. Der Plan liefert nur den Job-Bezug."
//
// Dasselbe ADR schreibt die Reihenfolge vor: erst der Vertrag, dann das
// PAKET, dann das Repo. Das hier ist Schritt 2. Der Vertrag steht in
// ADR-006, Abschnitt „Der Vertrag ‚Crew & Geld'".
//
// ─── WARUM DER SCHNITT HIER SAUBER IST ─────────────────────────────────────
//
// Gemessen am 2026-09-19 im Cable-Planer: `types/labour.ts` hatte KEINEN
// einzigen Import, und die drei Rechenmodule hingen ausschliesslich daran.
// Diese Domaene hat nie am Kabelgraph gehangen — deshalb liess sie sich
// herausschneiden, ohne dass etwas brach.
//
// ─── WAS HIER NICHT HINEINGEHOERT ──────────────────────────────────────────
//
// * CSV. `lib/csv.ts` hat 19 Nutzer quer durch den Planer; es ist generische
//   Infrastruktur wie `mergeDefined` beim Lager. Dieses Paket erzeugt eine
//   TABELLE, und wer daraus eine Datei macht, entscheidet der Aufrufer.
// * Der Kostenvergleich (`costComparison`). Er liest `project.equipment` und
//   `project.deliveryDestinations`: eine Kostenzeile haengt ueber `CostAnchor`
//   an einem Geraet DIESES Plans. Die Frage „geplant gegen tatsaechlich" ist
//   eine Frage des Plans an dieses Werkzeug — die Verankerung bleibt drueben.
// * `crewNetworkSheet`. Der Name sagt „Crew", der Inhalt ist der Kabelgraph
//   (Adressplan, Switch-Ports). Wer es nach dem Namen einsortiert, holt
//   danach den halben Netz-Teil aus einem fremden Repo.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
export * from './receipt'
export * from './labour'
export * from './labourCost'
export * from './crewBilling'
export * from './crewCalendar'

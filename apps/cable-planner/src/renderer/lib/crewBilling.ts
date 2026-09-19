// ───────────────────────────────────────────────────────────────────────────
// Crew-Abrechnung — die Rechnung liegt in `@avplan/crew-core` (ADR-006).
//
// HIER BLEIBT NUR DIE CSV-ZEILE, und das ist die Aussage des Schnitts: das
// Paket erzeugt eine TABELLE, `toCsv` macht daraus eine Datei. `lib/csv.ts`
// hat 19 Nutzer quer durch den Planer — generische Infrastruktur wie
// `mergeDefined` beim Lager, die keiner Domaene gehoert. Sie ins Paket zu
// ziehen hiesse, sie zweimal zu fuehren.
// ───────────────────────────────────────────────────────────────────────────
import { crewBillingTable, type CrewBilling } from '@avplan/crew-core'
import { toCsv } from './csv'

export * from '@avplan/crew-core'

export const crewBillingCsv = (b: CrewBilling): string => {
  const t = crewBillingTable(b)
  return toCsv(t.headers, t.rows)
}

// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): der gemeinsame Katalog am Lager.
//
// Hier hängt nur die Mechanik; die Regel steht in `typKatalog.ts`. Dieselbe
// Form wie `shellSeedBridge.ts` daneben, und aus demselben Grund: in der
// eigenen App gibt es `@avplan/device-catalog` nicht, und ein fester Import
// im Kern machte sie unbaubar.
//
// Angemeldet wird eine FUNKTION: der Katalog rechnet sich beim ersten
// Zugriff, und das soll nicht beim Start passieren.
// ───────────────────────────────────────────────────────────────────────────
import { alleTypen } from '@avplan/device-catalog'
import { registriereTypKatalog } from './typKatalog'

export function initTypKatalog(): void {
  registriereTypKatalog(() =>
    alleTypen().map((t) => ({
      id: t.id,
      ...(t.hersteller ? { hersteller: t.hersteller } : {}),
      modell: t.modell,
      kategorie: t.kategorie,
    })),
  )
}

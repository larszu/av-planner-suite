// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): Anschluss des Projekt-Seeds an das Lager.
//
// Die Abbildung selbst steht in `shellSeed.ts` und ist rein, damit sie
// headless prüfbar ist. Hier hängt nur die Mechanik — dieselbe Form wie in
// `cable-planner/lib/shellSeedBridge.ts`.
//
// Der Unterschied zu den drei Plan-Planern: `apply` SCHREIBT NICHT in den
// Bestand. Es legt den Bedarf zur Ansicht ab; eingebucht wird er erst, wenn
// jemand in der Bedarfs-Ansicht darauf drückt. Die Begründung steht in
// `shellSeed.ts` — ein Modulwechsel darf keine Lagerposition anlegen.
// ───────────────────────────────────────────────────────────────────────────
import { connectShellSeed } from '@avplan/ui/embed'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { bedarfAusSeed, deckungAusBestand } from './shellSeed'
import { useShellBedarf } from './shellBedarfStore'

/**
 * Projekt-Fluss Shell → Lager und zurück. No-op im Standalone-/Desktop-
 * Betrieb (dort ist `window.parent === window`).
 */
export function initShellSeed(): () => void {
  let letzteMeldung = ''

  const conn = connectShellSeed({
    domain: 'lager',
    apply: (seed) => {
      const { zeilen, offen } = bedarfAusSeed(seed)
      useShellBedarf.getState().setzen({
        zeilen,
        offen,
        roh: seed.bedarf,
        ...(seed.projectName ? { projekt: seed.projectName } : {}),
      })
      // Immer `true`, auch bei leerem Bedarf: die Übernahme ist hier ein
      // Anzeigen, und „der Plan braucht gerade nichts" ist eine Auskunft, die
      // ankommen muss. Die Abwehr der drei Plan-Planer („leerer Seed darf
      // gefüllten Plan nicht löschen") hat hier kein Gegenstück — es wird
      // nichts gelöscht.
      return true
    },
    collect: () => ({
      deckung: deckungAusBestand(useShellBedarf.getState().roh, useInventoryStore.getState().items),
    }),
  })

  // Melden, sobald sich der Bestand ODER der angebotene Bedarf ändert: die
  // Deckung hängt an beidem. Ohne den zweiten Abonnenten stünde nach dem
  // ersten Seed eine Deckung über einen Bedarf, den es da noch nicht gab.
  const melde = () => {
    const patch = JSON.stringify(
      deckungAusBestand(useShellBedarf.getState().roh, useInventoryStore.getState().items),
    )
    if (patch === letzteMeldung) return
    letzteMeldung = patch
    conn.publish()
  }

  const abBestand = useInventoryStore.subscribe(melde)
  const abBedarf = useShellBedarf.subscribe(melde)

  return () => {
    abBestand()
    abBedarf()
    conn.dispose()
  }
}

// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): der ANGEBOTENE Bedarf des Plans.
//
// Er liegt bewusst in einem eigenen Store und nicht im `inventoryStore`:
//
//   * Er gehört dem Lager nicht. Er ist die Ableitung eines anderen Werkzeugs
//     und kommt bei jeder neuen Seed-Revision frisch — ihn neben den Bestand
//     zu legen hiesse, zwei Dinge in einem Speicher zu führen, von denen nur
//     eines gezählt ist.
//
//   * Er wird NICHT persistiert. Alle drei Lager-Stores schreiben in
//     `localStorage` (`storageKeys.ts`); dieser nicht. Ein Bedarf, der einen
//     Neustart überlebt, behauptet den Stand eines Plans, den seither niemand
//     gesehen hat. Er kommt beim nächsten Seed ohnehin wieder — und wenn
//     nicht, dann weil das Lager gerade allein läuft, und dann ist „kein
//     Bedarf angeboten" die wahre Auskunft.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import type { SeedBedarf } from '@avplan/ui/embed'
import type { BedarfsZeile } from '../domain/types/bedarf'

interface ShellBedarfState {
  /** Die übernehmbaren Zeilen — Modell und Menge. */
  zeilen: BedarfsZeile[]
  /**
   * Zeilen, zu denen der Plan kein Modell führt. Sie sind NICHT übernehmbar
   * und stehen trotzdem hier: ein Bedarf, den das Lager verschweigt, weil er
   * unvollständig ist, fehlt am Ladedock genauso wie einer, den niemand
   * eingetragen hat.
   */
  offen: SeedBedarf[]
  /** Name des Shell-Projekts, aus dem der Bedarf kommt — nur zur Anzeige. */
  projekt?: string
  /** Der rohe Bedarf, wie er ankam. Grundlage der Deckungs-Meldung zurück. */
  roh: SeedBedarf[]
  setzen: (input: Pick<ShellBedarfState, 'zeilen' | 'offen' | 'roh' | 'projekt'>) => void
}

export const useShellBedarf = create<ShellBedarfState>((set) => ({
  zeilen: [],
  offen: [],
  roh: [],
  setzen: (input) => set(input),
}))

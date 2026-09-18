// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): Anschluss des Projekt-Flusses an das Haus.
//
// Die Abbildung steht in `shellSeed.ts` und ist rein. Hier hängt nur die
// Mechanik — dieselbe Form wie in den anderen vier Planern.
// ───────────────────────────────────────────────────────────────────────────
import { connectShellSeed } from '@avplan/ui/embed'
import { useGebaeudeStore } from '../domain/store/gebaeudeStore'
import { anschluesseAusGebaeude } from './shellSeed'

export function initShellSeed(): () => void {
  let letzteMeldung = ''

  const conn = connectShellSeed({
    domain: 'gebaeude',
    // Der Seed wird ANGENOMMEN und nicht verarbeitet, und das ist der
    // Zuschnitt und keine Lücke: das Gebäude ist die Anlage, nicht die Show.
    // Kameras und Kabel einer Produktion in den Hausbestand zu schreiben
    // machte aus dem Haus ein Show-Modell — genau das, was `grenze:check`
    // hier verhindert. `true` heisst deshalb „angekommen", nicht
    // „eingearbeitet"; ohne die Bestätigung hielte die Shell den Rahmen für
    // tot und sendete ihm nie wieder etwas.
    apply: () => true,
    collect: () => ({ anschluesse: anschluesseAusGebaeude(useGebaeudeStore.getState().gebaeude) }),
  })

  const abo = useGebaeudeStore.subscribe(() => {
    const patch = JSON.stringify(anschluesseAusGebaeude(useGebaeudeStore.getState().gebaeude))
    if (patch === letzteMeldung) return
    letzteMeldung = patch
    conn.publish()
  })

  return () => {
    abo()
    conn.dispose()
  }
}

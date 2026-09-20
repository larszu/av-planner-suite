import type { Identitaet } from '@avplan/ui/embed'

/**
 * Wer an diesem Rechner arbeitet — gespeichert, wo er hingehört.
 *
 * ─── AM GERÄT UND NICHT AM PROJEKT ────────────────────────────────────────
 *
 * Dieselbe Regel wie bei der Sprache und aus demselben Grund: wer eine
 * Projektdatei weitergibt, gibt nicht seinen Namen mit. Stünde die Identität
 * im Projekt, hiesse die Kollegin nach dem Öffnen der geschickten Datei
 * plötzlich wie der Absender — und jeder Kommentar, den sie danach schreibt,
 * trüge den falschen Namen.
 *
 * Deshalb: `localStorage`, neben der Sprache, und die Shell setzt sie beim
 * Aussenden in den Seed ein.
 */
const STORAGE_KEY = 'avplan.identitaet'

export function ladeIdentitaet(): Identitaet | undefined {
  try {
    const roh = window.localStorage.getItem(STORAGE_KEY)
    if (!roh) return undefined
    const o = JSON.parse(roh) as Partial<Identitaet>
    // Ein Eintrag ohne Namen ist keine Identität. Er entsteht, wenn jemand
    // das Feld leert — und dann soll auch nichts mehr da sein, statt eines
    // Objekts, das `identitaetOk` gleich wieder verwirft.
    if (typeof o?.name !== 'string' || !o.name.trim()) return undefined
    return {
      name: o.name,
      ...(typeof o.initialen === 'string' && o.initialen.trim() ? { initialen: o.initialen } : {}),
      ...(typeof o.farbe === 'string' && o.farbe.trim() ? { farbe: o.farbe } : {}),
    }
  } catch {
    return undefined
  }
}

export function speichereIdentitaet(i: Identitaet | undefined): void {
  try {
    if (!i || !i.name.trim()) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(i))
  } catch {
    /* Ein voller oder gesperrter Speicher darf die App nicht anhalten. */
  }
}

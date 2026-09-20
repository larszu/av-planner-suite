import { abrufbar, parseVorschau, type LinkVorschau } from '@avplan/ui/embed'

/**
 * Die Vorschau holen — wenn es hier einen Abruf gibt.
 *
 * ─── WARUM DAS HIER STEHT UND NICHT IM BOARD ──────────────────────────────
 *
 * Weil die Antwort „geht hier nicht" genauso ein Ergebnis ist wie eine
 * Vorschau, und weil sie an EINER Stelle entschieden gehoert. Im Fenster des
 * Browsers gibt es den Hauptprozess nicht, und ein `fetch` von dort scheitert
 * an der Same-Origin-Regel — fremde Seiten schicken keinen CORS-Kopf fuer
 * uns, und das ist ihr gutes Recht.
 *
 * Das Ergebnis sagt deshalb immer, WARUM nichts kam. Eine Karte, die nur
 * nichts zeigt, sieht aus wie eine, bei der jemand den Knopf vergessen hat.
 */
export type VorschauErgebnis =
  | { ok: true; vorschau: LinkVorschau }
  | { ok: false; grund: 'nur-im-desktop' | 'keine-webadresse' | 'nicht-erreichbar' | 'kein-html' | 'zeitueberschreitung' | 'zu-viele-weiterleitungen' }

interface VorschauHost {
  hole: (url: string) => Promise<{ ok: true; html: string; url: string } | { ok: false; grund: string }>
}

const host = (): VorschauHost | null => {
  const w = window as unknown as { __suiteLinkVorschau?: VorschauHost }
  return w.__suiteLinkVorschau ?? null
}

/** Gibt es hier ueberhaupt einen Abruf? Die Oberflaeche fragt das VOR dem Knopf. */
export const vorschauMoeglich = (): boolean => host() !== null

export async function holeVorschau(url: string): Promise<VorschauErgebnis> {
  const h = host()
  if (!h) return { ok: false, grund: 'nur-im-desktop' }
  const voll = /^https?:\/\//i.test(url) ? url : `https://${url}`
  if (!abrufbar(voll)) return { ok: false, grund: 'keine-webadresse' }
  const r = await h.hole(voll)
  if (!r.ok) return { ok: false, grund: (r.grund as VorschauErgebnis extends { ok: false; grund: infer G } ? G : never) ?? 'nicht-erreichbar' }
  return { ok: true, vorschau: parseVorschau(r.html, r.url, Date.now()) }
}

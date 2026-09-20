/**
 * Der Briefkasten, vom Fenster aus gesehen.
 *
 * ─── WARUM DAS HIER STEHT UND NICHT IM BOARD ──────────────────────────────
 *
 * Weil „geht hier nicht" genauso ein Ergebnis ist wie eine Adresse, und weil
 * es an EINER Stelle entschieden gehört. Im Browser gibt es keinen
 * Hauptprozess, also auch keinen Empfang — und eine Oberfläche, die dort
 * einen Knopf zeigt, der nichts tut, ist schlechter als eine, die sagt
 * warum.
 *
 * ─── WAS HIER NICHT LIEGT ─────────────────────────────────────────────────
 *
 * Das Geheimnis. Es kommt vom Hauptprozess, wird angezeigt, damit der Nutzer
 * es in die Erweiterung trägt, und sonst nirgends abgelegt — nicht im
 * `localStorage`, nicht im Projekt. Es gilt für einen Programmlauf; das ist
 * der Preis dafür, dass ein abgeschriebenes nur bis zum Beenden gilt.
 */
export interface Sendung {
  url: string
  titel?: string
  beschreibung?: string
  /** Die Textstelle, die jemand auf der Seite markiert hatte. */
  auswahl?: string
  bildUrl?: string
  geholtAm: number
}

export interface EinwurfZugang {
  url: string
  geheimnis: string
}

interface EinwurfHost {
  starte: () => Promise<{ ok: boolean; port?: number; geheimnis?: string; grund?: string }>
  beende: () => Promise<boolean>
  zugang: () => Promise<EinwurfZugang | null>
  hoere: (rueckruf: (s: Sendung) => void) => () => void
}

const host = (): EinwurfHost | null => {
  const w = window as unknown as { __suiteEinwurf?: EinwurfHost }
  return w.__suiteEinwurf ?? null
}

/** Gibt es hier überhaupt einen Empfang? Die Oberfläche fragt das VOR dem Knopf. */
export const einwurfMoeglich = (): boolean => host() !== null

export async function oeffneEinwurf(): Promise<{ ok: true; zugang: EinwurfZugang } | { ok: false; grund: 'nur-im-desktop' | 'kein-server' }> {
  const h = host()
  if (!h) return { ok: false, grund: 'nur-im-desktop' }
  const r = await h.starte()
  if (!r.ok) return { ok: false, grund: 'kein-server' }
  const z = await h.zugang()
  if (!z) return { ok: false, grund: 'kein-server' }
  return { ok: true, zugang: z }
}

export async function schliesseEinwurf(): Promise<void> {
  await host()?.beende()
}

export async function einwurfZugang(): Promise<EinwurfZugang | null> {
  return (await host()?.zugang()) ?? null
}

/** Auf Sendungen hören. Gibt eine Abmelde-Funktion zurück — auch im Browser,
 *  wo sie nichts abmeldet, damit der Aufrufer keinen Sonderfall braucht. */
export function hoereAufSendungen(rueckruf: (s: Sendung) => void): () => void {
  return host()?.hoere(rueckruf) ?? (() => {})
}

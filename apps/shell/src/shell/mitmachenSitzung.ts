import type { Anwesend } from '@avplan/ui/embed'
import { machMit, type Meldung, type Verbindung, type VerbindungsErgebnis } from './mitmachenHost'

/**
 * Die laufende Sitzung — EINE, und sie lebt neben React.
 *
 * ─── WARUM NICHT IM STATE EINER KOMPONENTE ────────────────────────────────
 *
 * Weil zwei Stellen sie brauchen, die einander nicht enthalten: die
 * Einstellungen machen sie auf und zu, die Board-Fläche schickt darüber. Läge
 * sie im State einer der beiden, wäre sie weg, sobald jemand die
 * Einstellungen schliesst — also genau dann, wenn die Zusammenarbeit anfängt.
 *
 * ─── WARUM NUR EINE ───────────────────────────────────────────────────────
 *
 * Zwei offene Verbindungen hiessen zwei Ströme derselben Fläche, die sich
 * gegenseitig ihre Stände zuspielen. Das Zusammenführen bliebe richtig — das
 * Netz nicht.
 */
export interface SitzungsStand {
  verbunden: boolean
  /** Wo wir mitmachen. Leer, solange niemand verbunden ist. */
  basis?: string
  /** Wer sonst noch da ist. Kommt aus den Meldungen, nie aus dem Projekt. */
  andere: Anwesend[]
  /** Der Strom ist abgerissen. `EventSource` versucht weiter — wer gerade
   *  schreibt, soll trotzdem sehen, dass es nicht ankommt. */
  gestoert: boolean
}

type Horcher = (s: SitzungsStand) => void

let verbindung: Verbindung | null = null
let basis: string | undefined
let gestoert = false
const andere = new Map<string, Anwesend>()
const horcher = new Set<Horcher>()
const meldungsHorcher = new Set<(m: Meldung) => void>()

const stand = (): SitzungsStand => ({
  verbunden: verbindung !== null,
  basis,
  andere: [...andere.values()],
  gestoert,
})

const ruf = () => {
  const s = stand()
  for (const h of horcher) h(s)
}

/** Auf den Sitzungs-Stand hören (für Anzeigen). Gibt eine Abmeldung zurück. */
export function hoereAufSitzung(h: Horcher): () => void {
  horcher.add(h)
  h(stand())
  return () => horcher.delete(h)
}

/** Auf die Meldungen hören (für die Fläche, die zusammenführt). */
export function hoereAufMeldungen(h: (m: Meldung) => void): () => void {
  meldungsHorcher.add(h)
  return () => meldungsHorcher.delete(h)
}

export const sitzungsStand = stand

export function verbinde(adresse: string, geheimnis: string): VerbindungsErgebnis {
  trenne()
  const r = machMit(
    adresse,
    geheimnis,
    (m) => {
      if (m.fort) {
        andere.delete(m.fort)
        ruf()
        return
      }
      if (m.anwesend) {
        // Der Zeitpunkt kommt von HIER und nicht vom Absender: sonst
        // entschiede dessen Uhr darüber, wann er als gegangen gilt.
        andere.set(m.anwesend.sitzung, { ...m.anwesend, zuletzt: Date.now() })
        ruf()
      }
      if (gestoert) {
        gestoert = false
        ruf()
      }
      for (const h of meldungsHorcher) h(m)
    },
    () => {
      if (!gestoert) {
        gestoert = true
        ruf()
      }
    },
  )
  if (!r.ok) return r
  verbindung = r.verbindung
  basis = adresse
  gestoert = false
  ruf()
  return r
}

export function trenne(): void {
  verbindung?.trenne()
  verbindung = null
  basis = undefined
  gestoert = false
  andere.clear()
  ruf()
}

/** Etwas hinausschicken. `false` heisst: kam nicht an. */
export async function melde(m: Parameters<Verbindung['melde']>[0]): Promise<boolean> {
  if (!verbindung) return false
  const ok = await verbindung.melde(m)
  if (!ok && !gestoert) {
    gestoert = true
    ruf()
  }
  return ok
}

/** Wer zu lange schweigt, wird vergessen. Wird vom Takt der Anzeige gerufen. */
export function vergissStille(jetzt: number, stilleMs: number): void {
  let weg = false
  for (const [id, a] of andere) {
    if (jetzt - a.zuletzt >= stilleMs) {
      andere.delete(id)
      weg = true
    }
  }
  if (weg) ruf()
}

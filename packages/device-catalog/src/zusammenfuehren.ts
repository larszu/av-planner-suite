// ───────────────────────────────────────────────────────────────────────────
// Mehrere Katalog-Quellen zu EINEM Katalog — und die Widersprüche laut.
//
// ─── WARUM DER MERGE BEFUNDE ERZEUGT STATT ZU ENTSCHEIDEN ──────────────────
//
// Zwei Quellen können für dieselbe Id verschiedene Angaben führen: der eine
// Katalog nennt die Kamera „FX9", der andere „PXW-FX9"; der eine trägt einen
// Datenblatt-Link, der andere einen anderen. Ein Merge, der still eine Seite
// nimmt, erzeugt eine Angabe, die in keiner Quelle so steht — und niemand
// sieht, dass entschieden wurde.
//
// Die Regel ist deshalb dieselbe wie bei `mergeSeedPatch` in der Shell:
// ÜBERNEHMEN UND MELDEN. Die erste Quelle in der Reihenfolge hält das Feld,
// jede abweichende Angabe wird zu einem BEFUND mit beiden Werten und beiden
// Quellennamen. Ein Befund ist Arbeit für einen Menschen; eine stille
// Auflösung ist Arbeit für niemanden und ein Fehler für alle.
//
// Der ergänzende Fall ist kein Widerspruch: wo die eine Quelle schweigt und
// die andere etwas sagt, zieht die Angabe ein. Genau dafür ist das Paket da —
// der Cable-Planer bekommt die Datenblatt-Links der 368 Kameramodelle, die er
// nicht hatte.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
import type { Geraetetyp, TypEingabe, TypQuelle } from './typ'

/** Zwei Quellen sagen etwas Verschiedenes über dasselbe Feld. */
export interface TypBefund {
  id: string
  feld: 'hersteller' | 'modell' | 'kategorie' | 'datenblattUrl'
  gehalten: { wert: string; quelle: string }
  abweichend: { wert: string; quelle: string }
}

export interface KatalogErgebnis {
  /** Der zusammengeführte Katalog, in der Reihenfolge des ersten Auftretens. */
  typen: Geraetetyp[]
  /** Leer heisst „nichts zu melden", nicht „nichts passiert". */
  befunde: TypBefund[]
}

const FELDER = ['hersteller', 'modell', 'kategorie', 'datenblattUrl'] as const

/**
 * Mehrere Quellen zu einem Katalog.
 *
 * Die REIHENFOLGE der Quellen entscheidet, wer ein Feld hält — sie ist damit
 * eine Angabe des Aufrufers und keine Eigenschaft dieser Funktion. Wer sie
 * ändert, ändert die Auskunft; deshalb steht sie beim Aufruf und nicht hier.
 */
export function fuehreZusammen(quellen: readonly TypQuelle[]): KatalogErgebnis {
  const jeId = new Map<string, Geraetetyp>()
  const befunde: TypBefund[] = []

  for (const { name, eintraege } of quellen) {
    for (const e of eintraege) {
      const bisher = jeId.get(e.id)
      if (!bisher) {
        jeId.set(e.id, { ...e, quellen: [name] })
        continue
      }

      let zusammen: Geraetetyp = { ...bisher, quellen: [...bisher.quellen, name] }
      for (const feld of FELDER) {
        const neu = e[feld]
        const alt = bisher[feld]
        if (neu === undefined || neu === '') continue
        if (alt === undefined || alt === '') {
          // Ergänzung, kein Widerspruch — genau wofür dieses Paket da ist.
          zusammen = { ...zusammen, [feld]: neu }
          continue
        }
        if (alt !== neu) {
          befunde.push({
            id: e.id,
            feld,
            gehalten: { wert: alt, quelle: bisher.quellen[0] },
            abweichend: { wert: neu, quelle: name },
          })
        }
      }
      jeId.set(e.id, zusammen)
    }
  }

  return { typen: [...jeId.values()], befunde }
}

/** Ein Eintrag je Id — und wo zwei Quellen dieselbe Id tragen, sagt es die Liste. */
export const mehrfachGefuehrt = (typen: readonly Geraetetyp[]): Geraetetyp[] =>
  typen.filter((t) => t.quellen.length > 1)

/** Einträge ohne Datenblatt. Eine AUSSAGE, kein Schweigen (vgl. catalogueEvidence). */
export const ohneBeleg = (typen: readonly Geraetetyp[]): Geraetetyp[] =>
  typen.filter((t) => !(t.datenblattUrl ?? '').trim())

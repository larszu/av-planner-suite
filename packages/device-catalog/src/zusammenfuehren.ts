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
import { normalisiere } from './identitaet'
import type { Geraetetyp, TypEingabe, TypQuelle } from './typ'

/**
 * Zwei Schreibweisen desselben Namens — oder wirklich zwei Namen?
 *
 * Der Cable-Katalog führt „Sony PMW-F5" in EINEM Feld, die Kameraliste
 * `manufacturer: 'Sony'` und `model: 'PMW-F5'` getrennt. Das sieht im
 * Feldvergleich aus wie ein Widerspruch und ist keiner: es ist dieselbe
 * Angabe in zwei AUFLÖSUNGEN.
 *
 * ADR-005 Regel 2 entscheidet den Fall wörtlich: „Wo dieselbe Information in
 * zwei Auflösungen in derselben Datei liegt, gewinnt die höhere." Die höhere
 * ist die getrennte — sie beantwortet „wer stellt das her?", die andere
 * nicht. Sie zieht deshalb ein, und es entsteht KEIN Befund.
 *
 * Ohne diese Regel meldete der Katalog am 2026-09-19 zwölf Widersprüche, die
 * keine waren — und ein Befundhaufen aus Nicht-Befunden ist genau die Sorte
 * Meldung, die nach dem dritten Mal niemand mehr liest.
 */
const gleicheAngabeFeiner = (grob: string, hersteller: string, modell: string): boolean =>
  normalisiere(grob) === normalisiere(`${hersteller} ${modell}`)

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

      // ADR-005 Regel 2: die höhere Auflösung gewinnt, bevor Feld für Feld
      // verglichen wird. Danach stimmen `hersteller` und `modell` überein,
      // und der Vergleich unten meldet nichts mehr.
      if (bisher.hersteller === undefined && e.hersteller !== undefined &&
          gleicheAngabeFeiner(bisher.modell, e.hersteller, e.modell)) {
        zusammen = { ...zusammen, hersteller: e.hersteller, modell: e.modell }
      }

      for (const feld of FELDER) {
        const neu = e[feld]
        const alt = zusammen[feld]
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

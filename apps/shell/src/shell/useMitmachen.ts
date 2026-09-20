import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FLAECHE,
  STILLE_MS,
  fuehreFlaecheZusammen,
  markiere,
  type Anwesend,
  type MitmachFlaeche,
  type Staende,
} from '@avplan/ui/embed'
import type { Board } from '../data/project'
import { eigeneAnwesenheit, sitzungsKennung } from './mitmachenHost'
import { hoereAufMeldungen, hoereAufSitzung, melde, sitzungsStand, vergissStille } from './mitmachenSitzung'

/**
 * Die Fläche an der Sitzung.
 *
 * ─── DIE STÄNDE STEHEN NICHT IM PROJEKT ───────────────────────────────────
 *
 * Sie liegen hier, in einem `ref`, und werden nicht gespeichert. Ein
 * Projekt, das Bearbeitungsstände trägt, trägt sie auch dann noch, wenn
 * niemand mehr mitmacht — und wer die Datei weitergibt, gäbe die Uhren
 * fremder Rechner mit.
 *
 * ─── WAS GESCHICKT WIRD ───────────────────────────────────────────────────
 *
 * Die ganze Fläche mit ihren Ständen, gedrosselt. Nicht die einzelne
 * Änderung: ein Board ist klein (Karten ohne eingebettete Dateien liegen im
 * Kilobyte-Bereich), und ein Verfahren, das nur Änderungen schickt, muss
 * Lücken bemerken — also nachfragen, quittieren, wiederholen. Das wäre ein
 * eigenes Protokoll für einen Gewinn, den hier niemand misst.
 *
 * ─── WARUM DIE EIGENEN ÄNDERUNGEN NICHT ZURÜCKKOMMEN ──────────────────────
 *
 * Der Server schickt niemandem seine eigene Meldung zurück (gemessen in
 * `apps/shell/test/mitmachen.test.ts`). Und was doch ankommt, kann nicht
 * schaden: das Zusammenführen ist reihenfolge-unabhängig, die eigene Fassung
 * gewinnt gegen ihre eigene ältere.
 */
const TAKT_MS = 400
/** Der Zeiger darf öfter, aber nicht bei jedem Pixel. */
const ZEIGER_MS = 120

export interface MitmachAnschluss {
  verbunden: boolean
  gestoert: boolean
  andere: Anwesend[]
  /** Diese Objekte hat gerade jemand anderes angefasst — dafür melden. */
  melde: (ids: readonly string[], geloescht?: boolean) => void
  /** Wo der eigene Zeiger auf der Fläche steht. */
  zeiger: (x: number, y: number, haelt?: string) => void
}

export function useMitmachen(
  board: Board,
  uebernimm: ((b: Board) => void) | undefined,
  name: string | undefined,
): MitmachAnschluss {
  const [sitzung, setSitzung] = useState(sitzungsStand)
  const staende = useRef<Staende>({})
  const flaeche = useRef<Board>(board)
  const offen = useRef(false)
  const zeigerZeit = useRef(0)
  /**
   * Wo der eigene Zeiger zuletzt stand.
   *
   * Er wird MITGESCHICKT, auch wenn gerade die ganze Flaeche hinausgeht.
   * Ohne das ueberschrieb der Takt der Flaeche (alle 400 ms, ohne Zeiger)
   * die Meldung des Zeigers — gemessen 2026-09-20: die andere Seite kannte
   * den Namen, aber nie eine Stelle, und zeichnete deshalb nichts.
   */
  const letzterZeiger = useRef<{ x?: number; y?: number; haelt?: string }>({})

  // Der letzte Stand der Flaeche, im `ref` und NICHT waehrend des Rendern
  // gesetzt: das Zusammenfuehren laeuft in einer Meldung, also ausserhalb
  // jedes Renderns, und ein `ref`, das beim Rendern beschrieben wird, ist
  // in React 19 ein Fehler — zu Recht, denn ein verworfener Durchlauf
  // hinterliesse ihn trotzdem geaendert.
  useEffect(() => {
    flaeche.current = board
  }, [board])

  useEffect(() => hoereAufSitzung(setSitzung), [])

  // Wer zu lange schweigt, verschwindet. Der Takt läuft nur, solange
  // jemand da ist — ein Zeitgeber ohne Zuschauer ist Arbeit ohne Wirkung.
  useEffect(() => {
    if (!sitzung.verbunden) return
    const t = setInterval(() => vergissStille(Date.now(), STILLE_MS), 2000)
    return () => clearInterval(t)
  }, [sitzung.verbunden])

  /** Die eigene Fläche hinausschicken — gedrosselt, und nie zwei auf einmal. */
  const schicke = useCallback(() => {
    if (offen.current) return
    offen.current = true
    setTimeout(() => {
      offen.current = false
      void melde({
        flaeche: flaeche.current as unknown as MitmachFlaeche,
        staende: staende.current,
        anwesend: eigeneAnwesenheit(name, letzterZeiger.current.x, letzterZeiger.current.y, letzterZeiger.current.haelt) ?? undefined,
      })
    }, TAKT_MS)
  }, [name])

  const meldeIds = useCallback(
    (ids: readonly string[], geloescht = false) => {
      if (!sitzung.verbunden || ids.length === 0) return
      staende.current = markiere(staende.current, ids, sitzungsKennung(), Date.now(), geloescht)
      schicke()
    },
    [sitzung.verbunden, schicke],
  )

  const zeiger = useCallback(
    (x: number, y: number, haelt?: string) => {
      if (!sitzung.verbunden) return
      const jetzt = Date.now()
      if (jetzt - zeigerZeit.current < ZEIGER_MS) return
      zeigerZeit.current = jetzt
      letzterZeiger.current = { x, y, haelt }
      const a = eigeneAnwesenheit(name, x, y, haelt)
      // OHNE NAMEN KEIN ZEIGER. Ein namenloser Pfeil auf fremder Fläche ist
      // ein Geist; wer mitmachen will, trägt sich in den Einstellungen ein.
      if (a) void melde({ anwesend: a })
    },
    [sitzung.verbunden, name],
  )

  // Was von den anderen kommt, wird zusammengeführt und übernommen.
  useEffect(() => {
    if (!uebernimm) return
    return hoereAufMeldungen((m) => {
      if (!m.flaeche || !m.staende) return
      const r = fuehreFlaecheZusammen(
        flaeche.current as unknown as MitmachFlaeche,
        staende.current,
        m.flaeche,
        m.staende,
      )
      staende.current = r.staende
      uebernimm(r.flaeche as unknown as Board)
    })
  }, [uebernimm])

  // Beim Verbinden einmal den eigenen Stand hinausschicken, damit die andere
  // Seite nicht wartet, bis hier jemand etwas anfasst. Alles, was da ist,
  // gilt als eben gesetzt — sonst gewönne jede fremde Karte gegen die eigene,
  // nur weil ihre Uhr eine Zahl hat und diese keine.
  useEffect(() => {
    if (!sitzung.verbunden) return
    const jetzt = Date.now()
    const ids = [FLAECHE, ...flaeche.current.cards.map((c) => c.id), ...flaeche.current.connections.map((v) => v.id)]
    staende.current = markiere(staende.current, ids, sitzungsKennung(), jetzt)
    void melde({
      flaeche: flaeche.current as unknown as MitmachFlaeche,
      staende: staende.current,
      anwesend: eigeneAnwesenheit(name, letzterZeiger.current.x, letzterZeiger.current.y) ?? undefined,
    })
  }, [sitzung.verbunden, name])

  return {
    verbunden: sitzung.verbunden,
    gestoert: sitzung.gestoert,
    andere: sitzung.andere,
    melde: meldeIds,
    zeiger,
  }
}

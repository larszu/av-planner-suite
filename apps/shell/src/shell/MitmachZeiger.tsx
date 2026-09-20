import type { Anwesend } from '@avplan/ui/embed'

/**
 * Die Zeiger der anderen.
 *
 * ─── SIE LIEGEN AUF DER FLÄCHE UND NICHT AUF DEM FENSTER ──────────────────
 *
 * In Flächen-Koordinaten, also mit demselben Zoom und derselben Verschiebung
 * wie die Karten. Ein Zeiger im Fenster-Raum stünde bei zwei verschieden
 * gezoomten Ansichten auf zwei verschiedenen Karten — und das ist genau die
 * Frage, die er beantworten soll.
 *
 * ─── SIE NEHMEN KEINE KLICKS ──────────────────────────────────────────────
 *
 * `pointer-events: none`. Ein fremder Zeiger, der die eigene Karte abdeckt,
 * wäre ein Fremdkörper im eigenen Arbeiten.
 */
export function MitmachZeiger({ andere }: { andere: readonly Anwesend[] }) {
  return (
    <>
      {andere.map((a) =>
        a.x === undefined || a.y === undefined ? null : (
          <div
            key={a.sitzung}
            className="pointer-events-none absolute z-[60] flex items-start gap-1"
            style={{ left: a.x, top: a.y }}
            aria-hidden="true"
          >
            <svg width="14" height="18" viewBox="0 0 14 18" fill={a.farbe}>
              <path d="M0 0 L0 14 L4 10.5 L6.5 16 L9 15 L6.5 9.5 L11.5 9.5 Z" />
            </svg>
            <span
              className="rounded-av-control px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight"
              style={{ background: a.farbe, color: '#12161d' }}
            >
              {a.name}
            </span>
          </div>
        ),
      )}
    </>
  )
}

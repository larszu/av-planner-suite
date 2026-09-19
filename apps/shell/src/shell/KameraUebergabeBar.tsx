import { Icon } from '@avplan/ui'
import type { KameraVorschlag } from '../data/kameraUebergabe'
import { format, useT } from '../i18n'

/**
 * Die Kamera aus dem Signalplan, die im Kameraplan noch fehlt.
 *
 * ─── DER AUFTRAG ────────────────────────────────────────────────────────
 *
 * Nutzer, 2026-09-19: „Wenn ich im ab planner suite den Cable planner
 * geöffnet habe und dort eine Kamera anlege muss diese auch im Multicam
 * planner angelegt und gezeigt werden."
 *
 * ─── WARUM DAS EIN STREIFEN IST UND KEIN AUTOMATISMUS ───────────────────
 *
 * Die Begruendung steht ausgeschrieben in `data/kameraUebergabe.ts`. Kurz:
 * im Signalplan steht auch die Kamera, die nur als QUELLE gebraucht wird und
 * im Bildplan nichts zu suchen hat. Stumm zu uebernehmen waere „letzter
 * gewinnt" — die Regel, gegen die nebenan schon der Konflikt-Streifen steht.
 *
 * Dieselben zwei Knoepfe wie dort, und der zweite ist keine Zier: ohne ihn
 * waere der Streifen nicht wegzubekommen, ohne die Kamera anzulegen.
 *
 * ─── WARUM DAS MODELL IM STREIFEN STEHT ─────────────────────────────────
 *
 * Der Kameraplan loest sein Katalog-Modell aus diesem Text auf und laesst
 * eine Kamera aus, deren Modell er nicht eindeutig trifft. Wer hier sieht,
 * dass kein Modell dasteht, weiss vorher, dass drueben nichts ankommt —
 * statt es hinterher zu suchen.
 */
export function KameraUebergabeBar({
  vorschlaege,
  onUebernehmen,
  onAblehnen,
}: {
  vorschlaege: KameraVorschlag[]
  onUebernehmen: (nodeId: string) => void
  onAblehnen: (nodeId: string) => void
}) {
  const t = useT()
  if (vorschlaege.length === 0) return null

  return (
    <section
      className="flex flex-col gap-1 border-t border-av-border bg-av-surface-2 px-3 py-2"
      aria-label={t('seed.kamera.region', 'Kameras aus dem Signalplan, die im Kameraplan fehlen')}
    >
      {vorschlaege.map((v) => (
        <div key={v.nodeId} className="flex flex-wrap items-center gap-2 text-[13px] text-av-text">
          <Icon name="camera" size={14} style={{ color: 'var(--mod-cameras)' }} />
          <span>
            {v.model
              ? format(
                  t(
                    'seed.kamera.line',
                    '{name} ({modell}) steht im Signalplan, aber noch nicht im Kameraplan — dort anlegen?',
                  ),
                  { name: v.name, modell: v.model },
                )
              : format(
                  t(
                    'seed.kamera.lineOhneModell',
                    '{name} steht im Signalplan, aber noch nicht im Kameraplan — ohne Modell wird der Kameraplan es nicht zuordnen können.',
                  ),
                  { name: v.name },
                )}
          </span>
          <span className="ml-auto flex gap-1">
            <button
              type="button"
              className="av-focus rounded-av-control border border-av-border px-2 py-0.5 hover:bg-av-surface-3"
              onClick={() => onUebernehmen(v.nodeId)}
            >
              {t('seed.kamera.accept', 'Im Kameraplan anlegen')}
            </button>
            <button
              type="button"
              className="av-focus rounded-av-control border border-av-border px-2 py-0.5 hover:bg-av-surface-3"
              onClick={() => onAblehnen(v.nodeId)}
            >
              {t('seed.kamera.dismiss', 'Nur im Signalplan')}
            </button>
          </span>
        </div>
      ))}
    </section>
  )
}

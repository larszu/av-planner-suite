import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@avplan/ui'
import { BOARD_FORMAT_RATIO, type BoardFormat } from '../data/project'
import { formatLaufzeit, sequenceSeconds, shotAt, type Shot } from '../data/board'
import { format, useT } from '../i18n'

/**
 * Das Board als Film.
 *
 * ─── DER AUFTRAG ────────────────────────────────────────────────────────
 *
 * Nutzer, 2026-09-20: die Boards sollen auch wie `recceboard` sein. Dort ist
 * ein Board keine Pinnwand, sondern eine Folge — sie läuft ab, man hält sie
 * in der Mitte an, springt an den Seiten einen Schnitt vor oder zurück,
 * zieht an der Zeitleiste, und sie läuft in Schleife.
 *
 * Genau diese Bedienung ist hier nachgebaut, weil sie gut ist: wer ein
 * Storyboard vorführt, hat eine Hand an der Maus und steht neben jemandem.
 * Drei Flächen über dem Bild sind schneller als drei Knöpfe darunter.
 *
 * ─── WAS DIESE FLÄCHE NICHT TUT ─────────────────────────────────────────
 *
 * Sie erzeugt kein Video. Sie zeigt Standbilder in ihrer Standzeit — das
 * ist, was ein Storyboard ist, und es ist ehrlicher als eine Vorschau, die
 * eine Bewegung andeutet, die niemand gedreht hat. Der Export als Datei ist
 * der Kontaktabzug daneben.
 *
 * ─── DIE BILDGRENZEN LIEGEN ÜBER DEM BILD ───────────────────────────────
 *
 * Und schneiden es nicht weg. Was ausserhalb des Formats liegt, ist die
 * Information, die beim Schneiden gebraucht wird — ein Bild, das in 2.39:1
 * beschnitten im Board liegt, lässt sich nicht mehr in 16:9 ansehen.
 */
export function BoardPlayer({
  shots,
  boardFormat,
  title,
  onClose,
}: {
  shots: Shot[]
  boardFormat?: BoardFormat
  title: string
  onClose: () => void
}) {
  const t = useT()
  const gesamt = sequenceSeconds(shots)
  const [t0, setT0] = useState(0)
  const [laeuft, setLaeuft] = useState(true)
  const uhr = useRef<number | null>(null)

  // Die Uhr läuft in Bildschirmschritten und nicht in Sekunden-Tickern: eine
  // Zeitleiste, die in Sprüngen von einer Sekunde wandert, sieht kaputt aus,
  // und die Standzeiten sind ohnehin krumm.
  useEffect(() => {
    if (!laeuft) return
    let vorher = performance.now()
    const schritt = (jetzt: number) => {
      const d = (jetzt - vorher) / 1000
      vorher = jetzt
      setT0((alt) => {
        const neu = alt + d
        // In Schleife, wie drüben. Ein Storyboard, das am Ende stehen bleibt,
        // muss nach jedem Durchlauf von Hand zurückgesetzt werden.
        return gesamt > 0 && neu >= gesamt ? 0 : neu
      })
      uhr.current = requestAnimationFrame(schritt)
    }
    uhr.current = requestAnimationFrame(schritt)
    return () => {
      if (uhr.current !== null) cancelAnimationFrame(uhr.current)
    }
  }, [laeuft, gesamt])

  const springe = useCallback(
    (richtung: -1 | 1) => {
      const aktuell = shotAt(shots, t0) ?? shots[shots.length - 1]
      if (!aktuell) return
      const ziel = shots[aktuell.nr - 1 + richtung]
      // Rückwärts an den Anfang DIESER Einstellung, wenn man schon mitten
      // drin ist — dieselbe Regel wie an jedem Abspielgerät.
      if (richtung === -1 && t0 - aktuell.startS > 0.35) {
        setT0(aktuell.startS)
        return
      }
      setT0(ziel ? ziel.startS : richtung === 1 ? 0 : 0)
    },
    [shots, t0],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ') { e.preventDefault(); setLaeuft((v) => !v); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); springe(1); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); springe(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, springe])

  if (typeof document === 'undefined') return null

  const aktuell = shotAt(shots, t0) ?? shots[0] ?? null
  const ratio = boardFormat ? BOARD_FORMAT_RATIO[boardFormat] : undefined

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-av-bg"
      role="dialog"
      aria-modal="true"
      aria-label={format(t('board.play.aria', 'Board {title} als Film'), { title })}
    >
      <div className="flex items-center gap-2 border-b border-av-border-muted bg-av-surface-1 px-3 py-2">
        <Icon name="board" size={15} style={{ color: 'var(--av-accent)' }} />
        <span className="text-[13px] font-semibold text-av-text">{title}</span>
        <span className="text-[12px] text-av-text-muted">
          {aktuell
            ? format(t('board.play.shotOf', 'Einstellung {n} von {ges}'), { n: aktuell.nr, ges: shots.length })
            : t('board.play.none', 'Keine Einstellung auf diesem Board')}
        </span>
        {boardFormat && <span className="text-[12px] text-av-text-faint">{boardFormat}</span>}
        <span className="ml-auto text-[12px] tabular-nums text-av-text-muted">
          {formatLaufzeit(t0)} / {formatLaufzeit(gesamt)}
        </span>
        <button
          type="button"
          className="av-icon-btn av-focus"
          onClick={onClose}
          aria-label={t('board.play.close', 'Film schließen')}
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {aktuell ? (
          <Bild shot={aktuell} ratio={ratio} />
        ) : (
          <div className="grid h-full place-items-center text-[13px] text-av-text-muted">
            {t('board.play.empty', 'Lege Fotos oder Looks auf das Board — sie sind die Einstellungen.')}
          </div>
        )}

        {/* Die drei Flächen von recceboard: Mitte hält an, die Seiten
            schneiden weiter. Sie liegen ÜBER dem Bild und tragen deshalb
            einen Namen — ohne den wären es drei unsichtbare Knöpfe. */}
        <button
          type="button"
          className="av-focus absolute inset-y-0 left-0 w-1/4 cursor-w-resize"
          onClick={() => springe(-1)}
          aria-label={t('board.play.prev', 'Einen Schnitt zurück')}
        />
        <button
          type="button"
          className="av-focus absolute inset-y-0 left-1/4 w-1/2"
          onClick={() => setLaeuft((v) => !v)}
          aria-label={laeuft ? t('board.play.pause', 'Anhalten') : t('board.play.resume', 'Weiter')}
        />
        <button
          type="button"
          className="av-focus absolute inset-y-0 right-0 w-1/4 cursor-e-resize"
          onClick={() => springe(1)}
          aria-label={t('board.play.next', 'Einen Schnitt weiter')}
        />

        {!laeuft && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-av-border bg-av-surface-2 px-3 py-1.5 text-[12px] text-av-text">
            {t('board.play.paused', 'Angehalten — Leertaste oder Mitte klicken')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-av-border-muted bg-av-surface-1 px-3 py-2">
        <button
          type="button"
          className="av-toolbar-btn av-focus"
          onClick={() => setLaeuft((v) => !v)}
          aria-label={laeuft ? t('board.play.pause', 'Anhalten') : t('board.play.resume', 'Weiter')}
        >
          <Icon name={laeuft ? 'close' : 'check'} size={15} />
          <span className="text-[12px]">{laeuft ? t('board.play.pause', 'Anhalten') : t('board.play.resume', 'Weiter')}</span>
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0.1, gesamt)}
          step={0.05}
          value={Math.min(t0, gesamt)}
          onChange={(e) => { setLaeuft(false); setT0(Number(e.target.value)) }}
          className="av-focus h-1 flex-1 accent-[var(--av-accent)]"
          aria-label={t('board.play.scrub', 'Zeitleiste')}
        />
        <span className="text-[12px] tabular-nums text-av-text-muted">
          {aktuell ? format(t('board.play.shotSeconds', '{s} s'), { s: aktuell.durationS }) : '—'}
        </span>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Eine Einstellung, so gross wie sie passt.
 *
 * Ein Look hat kein Bild — er ist eine Farbe, und die füllt den Rahmen. Das
 * ist kein Platzhalter: auf einem Storyboard steht ein Look für eine
 * Stimmung, die noch kein Bild hat, und genau das zeigt er dann auch.
 */
function Bild({ shot, ratio }: { shot: Shot; ratio?: number }) {
  const t = useT()
  const c = shot.card
  return (
    <div className="grid h-full w-full place-items-center p-6">
      <div
        className="relative max-h-full max-w-full"
        style={{ aspectRatio: ratio ? String(ratio) : c.ratio ? String(c.ratio) : '16 / 9', width: '100%' }}
      >
        {c.src ? (
          <img
            src={c.src}
            alt={c.title ?? t('board.photoAlt', 'Foto')}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-full w-full" style={{ background: c.color ?? 'var(--av-surface-2)' }} />
        )}
        {/* Die Bildgrenze liegt ÜBER dem Bild. Sie schneidet nichts weg. */}
        {ratio !== undefined && (
          <div className="pointer-events-none absolute inset-0 border border-av-accent/70" />
        )}
        {c.title && (
          <div className="absolute bottom-0 left-0 bg-av-surface-1/90 px-2 py-1 text-[12px] text-av-text">
            {shot.nr} · {c.title}
          </div>
        )}
      </div>
    </div>
  )
}

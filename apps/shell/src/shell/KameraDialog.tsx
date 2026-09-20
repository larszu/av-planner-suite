import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@avplan/ui'
import { oeffneKamera, type KameraAbsageGrund, type LaufendeKamera } from './kameraAufnahme'
import { useT } from '../i18n'

/**
 * Der Sucher.
 *
 * Er zeigt das LIVE-BILD und nicht nur einen Knopf: wer ein Motiv knipst,
 * richtet zuerst aus. Ein Auslöser ohne Sucher ist ein Glücksspiel, und das
 * Foto landet dann trotzdem auf dem Board.
 *
 * Die Kamera wird beim Schliessen abgeschaltet — immer, auch wenn jemand
 * abbricht oder die Taste Esc drückt. Eine Leuchte, die nach dem Zumachen
 * weiterbrennt, ist das, was ein Werkzeug unseriös macht.
 */
export function KameraDialog({
  onFoto,
  onClose,
}: {
  onFoto: (datei: File) => void
  onClose: () => void
}) {
  const t = useT()
  const video = useRef<HTMLVideoElement | null>(null)
  const kamera = useRef<LaufendeKamera | null>(null)
  const [absage, setAbsage] = useState<KameraAbsageGrund | null>(null)
  const [bereit, setBereit] = useState(false)

  useEffect(() => {
    let abgeraeumt = false
    void (async () => {
      const k = await oeffneKamera()
      if ('ok' in k) {
        setAbsage(k.grund)
        return
      }
      if (abgeraeumt) {
        // Wer schneller zumacht als die Freigabe kommt, soll trotzdem keine
        // laufende Kamera hinterlassen.
        k.schliessen()
        return
      }
      kamera.current = k
      if (video.current) {
        video.current.srcObject = k.strom
        void video.current.play().catch(() => {})
      }
      setBereit(true)
    })()
    return () => {
      abgeraeumt = true
      kamera.current?.schliessen()
      kamera.current = null
    }
  }, [])

  const ausloesen = useCallback(() => {
    const k = kamera.current
    if (!k) return
    const r = k.ausloesen()
    if (!r.ok) {
      setAbsage(r.grund)
      return
    }
    // Als DATEI zurück, nicht als data-URL: die Fläche legt jede Datei auf
    // demselben Weg ab und prüft dort die Einbettungs-Grenze. Ein zweiter
    // Weg hierfür wäre dieselbe Prüfung ein zweites Mal — oder gar nicht.
    const roh = atob(r.dataUrl.slice(r.dataUrl.indexOf(',') + 1))
    const bytes = new Uint8Array(roh.length)
    for (let i = 0; i < roh.length; i += 1) bytes[i] = roh.charCodeAt(i)
    const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    onFoto(new File([bytes], `foto-${stempel}.jpg`, { type: 'image/jpeg' }))
    onClose()
  }, [onFoto, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && bereit) { e.preventDefault(); ausloesen() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, ausloesen, bereit])

  if (typeof document === 'undefined') return null

  const absageText: Record<KameraAbsageGrund, string> = {
    'keine-kamera': t('board.kamera.keine', 'Dieser Rechner bietet keine Kamera an.'),
    abgelehnt: t('board.kamera.abgelehnt', 'Ohne Kamera-Freigabe geht kein Foto.'),
    abgebrochen: t('board.kamera.abgebrochen', 'Abgebrochen.'),
    'kein-bild': t('board.kamera.keinBild', 'Die Kamera hat noch kein Bild geliefert. Warte einen Moment und löse erneut aus.'),
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[310] flex flex-col bg-av-bg"
      role="dialog"
      aria-modal="true"
      aria-label={t('board.kamera.titel', 'Foto aufnehmen')}
    >
      <div className="flex items-center gap-2 border-b border-av-border-muted bg-av-surface-1 px-3 py-2">
        <Icon name="camera" size={15} style={{ color: 'var(--av-accent)' }} />
        <span className="text-[13px] font-semibold text-av-text">{t('board.kamera.titel', 'Foto aufnehmen')}</span>
        <button
          type="button"
          className="av-icon-btn av-focus ml-auto"
          onClick={onClose}
          aria-label={t('board.kamera.schliessen', 'Kamera schließen')}
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="relative grid min-h-0 flex-1 place-items-center p-4">
        {absage ? (
          <p className="max-w-md text-center text-[13px] text-av-text-muted">{absageText[absage]}</p>
        ) : (
          <video ref={video} muted playsInline className="max-h-full max-w-full" />
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-av-border-muted bg-av-surface-1 px-3 py-3">
        <button
          type="button"
          className="av-toolbar-btn av-focus"
          onClick={ausloesen}
          disabled={!bereit || absage !== null}
        >
          <Icon name="camera" size={15} />
          <span className="text-[12px]">{t('board.kamera.ausloesen', 'Auslösen (Leertaste)')}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}

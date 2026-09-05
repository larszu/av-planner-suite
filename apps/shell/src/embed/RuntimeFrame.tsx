import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@avplan/ui'
import type { RuntimeDef } from '../modules/runtimes'
import { useT, format } from '../i18n'

/**
 * Host für die Oberfläche einer der vier Laufzeit-Anwendungen (Tally, Kamera,
 * Intercom, Medien-Station).
 *
 * UNTERSCHIED ZU `PlannerFrame`. Ein Planer wird mitgeliefert und ist deshalb
 * immer da; ein Gerät im Netz ist es nicht. Der Normalfall „läuft gerade
 * nicht" darf hier kein toter Rahmen sein und erst recht keine Attrappe: er
 * sagt, welche Adresse versucht wurde, was dort laufen müsste und wie man es
 * startet — und lässt die Adresse ändern.
 *
 * ERREICHBARKEIT WIRD GEMESSEN, NICHT GERATEN. Ein `<iframe>` auf einen toten
 * Host feuert `load` genau wie auf einen lebenden — dort steht dann Chromiums
 * Fehlerseite, und der Rahmen sähe „bereit" aus. Deshalb geht vorher ein
 * `fetch(..., { mode: 'no-cors' })` an dieselbe URL: die Antwort ist opak
 * (der Inhalt interessiert nicht), aber sie kommt nur, wenn dort wirklich
 * jemand antwortet.
 */
export function RuntimeFrame({
  runtime,
  url,
  onOpenSettings,
}: {
  runtime: RuntimeDef
  url: string
  /** Öffnet die Einstellungen auf dem Tab „Geräte im Netz". */
  onOpenSettings?: () => void
}) {
  const t = useT()
  const [state, setState] = useState<'pruefen' | 'da' | 'weg'>('pruefen')
  const [versuch, setVersuch] = useState(0)
  const abbruch = useRef<AbortController | null>(null)

  const pruefen = useCallback(() => {
    abbruch.current?.abort()
    const ctrl = new AbortController()
    abbruch.current = ctrl
    setState('pruefen')
    // `verworfen` trennt die beiden Gruende fuer einen Abbruch: eine
    // abgelaufene Frist ist ein BEFUND („nicht erreichbar"), ein Wechsel des
    // Moduls oder der Adresse ist keiner. Ohne die Unterscheidung schriebe der
    // Aufraeum-Pfad noch in einen Zustand, den niemand mehr anzeigt.
    let verworfen = false
    const frist = window.setTimeout(() => ctrl.abort(), 4000)
    fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' })
      .then(() => {
        window.clearTimeout(frist)
        if (!verworfen) setState('da')
      })
      .catch(() => {
        window.clearTimeout(frist)
        if (!verworfen) setState('weg')
      })
    return () => {
      verworfen = true
      window.clearTimeout(frist)
      ctrl.abort()
    }
  }, [url])

  useEffect(() => {
    const auf = pruefen()
    return auf
  }, [pruefen, versuch])

  const erneut = () => setVersuch((v) => v + 1)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-av-card border border-av-border bg-av-surface-3">
      {state === 'da' && (
        <iframe
          key={`${url}#${versuch}`}
          src={url}
          title={runtime.title}
          className="h-full w-full border-0 bg-av-surface-3"
        />
      )}
      {state === 'pruefen' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-av-text-muted">
          {format(t('chrome.runtime.checking', '{title} wird gesucht …'), { title: runtime.title })}
        </div>
      )}
      {state === 'weg' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <Icon name={runtime.icon} size={28} />
          <div className="text-base font-semibold text-av-text">
            {format(t('chrome.runtime.unreachable', '{title} ist unter {url} nicht erreichbar'), {
              title: runtime.title,
              url,
            })}
          </div>
          <p className="max-w-lg text-sm text-av-text-muted">{runtime.was}</p>
          <p className="max-w-lg text-sm text-av-text-faint">
            {runtime.start} ({t('chrome.runtime.repo', 'Repository')}: <code>{runtime.repo}</code>)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={erneut}>
              {t('chrome.runtime.retry', 'Erneut suchen')}
            </Button>
            {onOpenSettings && (
              <Button variant="subtle" onClick={onOpenSettings}>
                <Icon name="settings" size={15} /> {t('chrome.runtime.changeAddress', 'Adresse ändern')}
              </Button>
            )}
            <Button variant="subtle" onClick={() => window.open(url, '_blank', 'noopener')}>
              <Icon name="external" size={15} /> {t('chrome.runtime.openNewTab', 'In neuem Tab öffnen')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

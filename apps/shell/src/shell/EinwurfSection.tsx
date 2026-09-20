import { useCallback, useEffect, useState } from 'react'
import { einwurfMoeglich, einwurfZugang, oeffneEinwurf, schliesseEinwurf, type EinwurfZugang } from './einwurfHost'
import type { TFunc } from '../i18n'

/**
 * Der Briefkasten in den Einstellungen.
 *
 * ─── ER STEHT NICHT VON SELBST OFFEN ──────────────────────────────────────
 *
 * Das ist die eigentliche Entscheidung hier. Ein Empfang, der mit der
 * Anwendung startet, ist eine Tür, von der niemand weiss — und sie steht im
 * eigenen Rechner. Also macht der Nutzer sie auf, sieht sie offen stehen und
 * kann sie zumachen.
 *
 * ─── DAS GEHEIMNIS STEHT DA, UND ZWAR GANZ ────────────────────────────────
 *
 * Nicht mit Punkten verdeckt: es muss abgeschrieben oder kopiert werden, und
 * ein Wert, den man nicht lesen kann, wird per Bildschirmfoto weitergereicht.
 * Es gilt für DIESEN Programmlauf — das steht daneben, damit niemand es sich
 * notiert und sich beim nächsten Start über die Ablehnung wundert.
 */
export function EinwurfSection({ t }: { t: TFunc }) {
  const moeglich = einwurfMoeglich()
  const [zugang, setZugang] = useState<EinwurfZugang | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [kopiert, setKopiert] = useState(false)

  useEffect(() => {
    // Beim Aufmachen der Einstellungen nachsehen, ob er schon offen ist —
    // sonst böte der Knopf an, etwas zu öffnen, das läuft.
    void einwurfZugang().then(setZugang)
  }, [])

  const auf = useCallback(async () => {
    const r = await oeffneEinwurf()
    if (!r.ok) {
      setMeldung(
        r.grund === 'nur-im-desktop'
          ? t('chrome.einwurf.nurDesktop', 'Den Briefkasten gibt es nur in der Desktop-Fassung — im Browser kann diese Seite nichts empfangen.')
          : t('chrome.einwurf.keinServer', 'Der Briefkasten liess sich nicht öffnen.'),
      )
      return
    }
    setMeldung(null)
    setZugang(r.zugang)
  }, [t])

  const zu = useCallback(async () => {
    await schliesseEinwurf()
    setZugang(null)
    setKopiert(false)
  }, [])

  return (
    <section className="mt-2 rounded-av-card border border-av-border bg-av-surface-2 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-av-text">
          {t('chrome.einwurf.titel', 'Web-Clipper')}
        </span>
        <button
          type="button"
          className="av-toolbar-btn av-focus ml-auto"
          onClick={() => void (zugang ? zu() : auf())}
          disabled={!moeglich}
        >
          <span className="text-[12px]">
            {zugang
              ? t('chrome.einwurf.schliessen', 'Briefkasten schließen')
              : t('chrome.einwurf.oeffnen', 'Briefkasten öffnen')}
          </span>
        </button>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-snug text-av-text-muted">
        {moeglich
          ? t(
              'chrome.einwurf.hinweis',
              'Solange der Briefkasten offen ist, kann die Browser-Erweiterung aus tools/web-clipper die Seite, die du ansiehst, auf das gerade geöffnete Board legen. Er hört nur auf diesen Rechner.',
            )
          : t(
              'chrome.einwurf.nurDesktop',
              'Den Briefkasten gibt es nur in der Desktop-Fassung — im Browser kann diese Seite nichts empfangen.',
            )}
      </p>

      {meldung && <p className="mt-1.5 text-[11.5px] text-av-warn">{meldung}</p>}

      {zugang && (
        <div className="mt-2 flex flex-col gap-1.5">
          <label className="text-[11.5px] text-av-text-muted" htmlFor="einwurf-adresse">
            {t('chrome.einwurf.adresse', 'Adresse')}
          </label>
          <input
            id="einwurf-adresse"
            readOnly
            value={zugang.url}
            onFocus={(e) => e.currentTarget.select()}
            className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none"
          />
          <label className="text-[11.5px] text-av-text-muted" htmlFor="einwurf-geheimnis">
            {t('chrome.einwurf.geheimnis', 'Geheimnis — gilt bis zum Beenden der Suite')}
          </label>
          <input
            id="einwurf-geheimnis"
            readOnly
            value={zugang.geheimnis}
            onFocus={(e) => e.currentTarget.select()}
            className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none"
          />
          <button
            type="button"
            className="av-toolbar-btn av-focus self-start"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`${zugang.url}\n${zugang.geheimnis}`)
                .then(() => setKopiert(true))
                .catch(() => setKopiert(false))
            }}
          >
            <span className="text-[12px]">
              {kopiert ? t('chrome.einwurf.kopiert', 'Kopiert') : t('chrome.einwurf.kopieren', 'Beides kopieren')}
            </span>
          </button>
        </div>
      )}
    </section>
  )
}

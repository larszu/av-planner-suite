import { useCallback, useEffect, useState } from 'react'
import { aufmachenMoeglich, macheAuf, macheZu, mitmachZugang, type MitmachZugang } from './mitmachenHost'
import { hoereAufSitzung, trenne, verbinde, type SitzungsStand } from './mitmachenSitzung'
import { sitzungsStand } from './mitmachenSitzung'
import type { TFunc } from '../i18n'

/**
 * Zusammenarbeiten — in den Einstellungen, weil es eine Entscheidung ist.
 *
 * ─── ZWEI SEITEN, UND SIE SIND NICHT GLEICH ───────────────────────────────
 *
 * AUFMACHEN geht nur in der Desktop-Fassung: dort gibt es den Prozess, der
 * im Netz zuhören kann. MITMACHEN geht überall — auch im Browser eines
 * Telefons im selben WLAN, ohne dass jemand etwas installiert. Beides steht
 * hier nebeneinander, und die Fläche sagt, was DIESES Fenster kann, statt
 * einen Knopf zu zeigen, der nichts tut.
 *
 * ─── DIE ADRESSE WIRD VORGELESEN ──────────────────────────────────────────
 *
 * Es gibt keine Einladung per Mail und keinen Kurzlink. Wer im selben Netz
 * sitzt, bekommt Adresse und Geheimnis gesagt oder als Bild geschickt — und
 * genau deshalb stehen beide gross und auswählbar da.
 */
export function MitmachenSection({ t }: { t: TFunc }) {
  const kannAufmachen = aufmachenMoeglich()
  const [zugang, setZugang] = useState<MitmachZugang | null>(null)
  const [sitzung, setSitzung] = useState<SitzungsStand>(sitzungsStand)
  const [adresse, setAdresse] = useState('')
  const [geheimnis, setGeheimnis] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)

  useEffect(() => hoereAufSitzung(setSitzung), [])
  useEffect(() => { void mitmachZugang().then(setZugang) }, [])

  const auf = useCallback(async () => {
    const r = await macheAuf()
    if (!r.ok) {
      setMeldung(
        r.grund === 'nur-im-desktop'
          ? t('chrome.mitmachen.nurDesktop', 'Aufmachen geht nur in der Desktop-Fassung. Mitmachen geht auch hier.')
          : t('chrome.mitmachen.keinServer', 'Das Fenster liess sich nicht öffnen.'),
      )
      return
    }
    setMeldung(null)
    setZugang(r.zugang)
    // Der Gastgeber macht bei sich selbst mit — über denselben Weg wie alle
    // anderen. Ein eigener Kurzschluss im Hauptprozess wäre eine zweite
    // Fassung derselben Sache, und die im Browser bliebe ungeprüft.
    const eigene = r.zugang.adressen[0]?.url ?? `http://127.0.0.1:${r.zugang.port}`
    const v = verbinde(eigene, r.zugang.geheimnis)
    if (!v.ok) setMeldung(t('chrome.mitmachen.keinServer', 'Das Fenster liess sich nicht öffnen.'))
  }, [t])

  const zu = useCallback(async () => {
    trenne()
    await macheZu()
    setZugang(null)
  }, [])

  const beitreten = useCallback(() => {
    const r = verbinde(adresse.trim(), geheimnis)
    if (!r.ok) {
      setMeldung(
        r.grund === 'keine-webadresse'
          ? t('chrome.mitmachen.keineAdresse', 'Das ist keine Adresse. Sie sieht aus wie http://192.168.1.23:44685')
          : t('chrome.mitmachen.nichtErreichbar', 'Dort antwortet niemand.'),
      )
      return
    }
    setMeldung(null)
  }, [adresse, geheimnis, t])

  return (
    <section className="mt-2 rounded-av-card border border-av-border bg-av-surface-2 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-av-text">
          {t('chrome.mitmachen.titel', 'Zusammen arbeiten')}
        </span>
        {sitzung.verbunden && (
          <span className="text-[11.5px] text-av-text-muted">
            {sitzung.gestoert
              ? t('chrome.mitmachen.gestoert', 'Verbindung gestört — was du änderst, kommt gerade nicht an.')
              : sitzung.andere.length === 1
                ? t('chrome.mitmachen.einer', 'Eine weitere Person ist dabei.')
                : sitzung.andere.length > 1
                  ? `${sitzung.andere.length} ${t('chrome.mitmachen.mehrere', 'weitere Personen sind dabei.')}`
                  : t('chrome.mitmachen.allein', 'Noch niemand sonst.')}
          </span>
        )}
        <button
          type="button"
          className="av-toolbar-btn av-focus ml-auto"
          onClick={() => void (zugang || sitzung.verbunden ? zu() : auf())}
          disabled={!kannAufmachen && !sitzung.verbunden}
        >
          <span className="text-[12px]">
            {zugang || sitzung.verbunden
              ? t('chrome.mitmachen.zumachen', 'Zumachen')
              : t('chrome.mitmachen.aufmachen', 'Fenster aufmachen')}
          </span>
        </button>
      </div>

      <p className="mt-1.5 text-[11.5px] leading-snug text-av-text-muted">
        {kannAufmachen
          ? t(
              'chrome.mitmachen.hinweis',
              'Einer macht auf, die anderen im selben Netz kommen dazu — im Browser, ohne Installation. Es läuft nichts über fremde Rechner, und es ist weg, sobald du zumachst.',
            )
          : t('chrome.mitmachen.nurDesktop', 'Aufmachen geht nur in der Desktop-Fassung. Mitmachen geht auch hier.')}
      </p>

      {meldung && <p className="mt-1.5 text-[11.5px] text-av-warn">{meldung}</p>}

      {zugang && (
        <div className="mt-2 flex flex-col gap-1.5">
          <span className="text-[11.5px] text-av-text-muted">
            {t('chrome.mitmachen.sagWeiter', 'Diese beiden weitersagen — sie gelten, bis du zumachst:')}
          </span>
          {zugang.adressen.length === 0 ? (
            <p className="text-[11.5px] text-av-warn">
              {t('chrome.mitmachen.keineAdressen', 'Dieser Rechner hat keine Adresse im Netz. Ohne Netzwerkverbindung kann niemand dazukommen.')}
            </p>
          ) : (
            zugang.adressen.map((a) => (
              <input
                key={a.url}
                readOnly
                value={a.url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label={a.name}
                className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none"
              />
            ))
          )}
          <input
            readOnly
            value={zugang.geheimnis}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t('chrome.mitmachen.geheimnis', 'Geheimnis')}
            className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none"
          />
        </div>
      )}

      {!zugang && !sitzung.verbunden && (
        <div className="mt-2 flex flex-col gap-1.5">
          <span className="text-[11.5px] text-av-text-muted">
            {t('chrome.mitmachen.beitretenHinweis', 'Oder bei jemandem mitmachen — Adresse und Geheimnis kommen von dem, der aufgemacht hat:')}
          </span>
          <input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="http://192.168.1.23:44685"
            aria-label={t('chrome.mitmachen.adresse', 'Adresse')}
            className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none placeholder:text-av-text-faint"
          />
          <input
            value={geheimnis}
            onChange={(e) => setGeheimnis(e.target.value)}
            type="password"
            aria-label={t('chrome.mitmachen.geheimnis', 'Geheimnis')}
            className="av-focus rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 font-mono text-[12px] text-av-text outline-none"
          />
          <button type="button" className="av-toolbar-btn av-focus self-start" onClick={beitreten}>
            <span className="text-[12px]">{t('chrome.mitmachen.beitreten', 'Mitmachen')}</span>
          </button>
        </div>
      )}
    </section>
  )
}

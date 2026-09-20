import { useState } from 'react'
import { Icon } from '@avplan/ui'
import {
  fadenFuer,
  schreibeKommentar,
  vollstaendig,
  type Identitaet,
  type Kommentar,
} from '@avplan/ui/embed'
import { format, useLanguage, useT } from '../i18n'

/**
 * Der Kommentar-Faden zu EINEM Ding.
 *
 * ─── WARUM ER HIER STEHT UND NICHT IM BOARD ───────────────────────────────
 *
 * Weil er nicht dem Board gehört. Ein Kommentar hängt an der Id eines
 * Objekts (`@avplan/ui`, `kommentare.ts`), und dieselbe Fläche zeigt ihn
 * später an einem Gerät in der Eigenschaften-Leiste, an einem Anschlusspunkt
 * oder an einer Kamera. Läge er in `BoardCanvas.tsx`, wäre die zweite
 * Fundstelle eine Abschrift.
 *
 * ─── OHNE NAMEN KEIN KOMMENTAR ────────────────────────────────────────────
 *
 * Das ist keine Schikane, sondern der Grund, aus dem es die Kommentare
 * vorher gar nicht gab: eine Äusserung ohne Urheber ist eine Notiz, und die
 * gibt es schon. Statt eines gesperrten Feldes ohne Erklärung steht hier der
 * Weg dorthin — ein Satz, der auf die Einstellungen zeigt.
 */
export function KommentarFaden({
  objektId,
  kommentare,
  identitaet,
  onSchreiben,
  onErledigt,
  onEinstellungen,
}: {
  objektId: string
  kommentare: readonly Kommentar[]
  identitaet: Identitaet | undefined
  onSchreiben: (text: string, antwortAuf?: string) => void
  onErledigt: (id: string, erledigt: boolean) => void
  onEinstellungen?: () => void
}) {
  const t = useT()
  const lang = useLanguage()
  const [text, setText] = useState('')
  const [antwortAuf, setAntwortAuf] = useState<string | undefined>(undefined)
  const faden = fadenFuer(kommentare, objektId)

  const zeit = (ms: number) =>
    new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms))

  return (
    <div className="flex flex-col gap-2">
      {faden.length === 0 && (
        <p className="text-[12px] text-av-text-muted">
          {t('kommentar.leer', 'Noch nichts besprochen.')}
        </p>
      )}

      {faden.map((k) => (
        <div
          key={k.id}
          className="flex gap-2 border-l-2 pl-2"
          style={{
            borderColor: k.autor.farbe,
            marginLeft: k.antwortAuf ? 18 : 0,
            opacity: k.erledigt ? 0.55 : 1,
          }}
        >
          <span
            className="mt-0.5 grid h-5 w-5 flex-none place-items-center text-[9.5px] font-semibold"
            style={{ background: k.autor.farbe, color: '#12161d' }}
            aria-hidden="true"
          >
            {k.autor.initialen}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 text-[11px] text-av-text-muted">
              <span className="font-semibold text-av-text-secondary">{k.autor.name}</span>
              <span>{zeit(k.zeit)}</span>
              <button
                type="button"
                className="av-focus ml-auto text-av-text-faint hover:text-av-text"
                onClick={() => onErledigt(k.id, !k.erledigt)}
                aria-pressed={!!k.erledigt}
                aria-label={
                  k.erledigt
                    ? t('kommentar.wiederOeffnen', 'Wieder öffnen')
                    : t('kommentar.erledigen', 'Als erledigt markieren')
                }
                title={
                  k.erledigt
                    ? t('kommentar.wiederOeffnen', 'Wieder öffnen')
                    : t('kommentar.erledigen', 'Als erledigt markieren')
                }
              >
                <Icon name="check" size={13} />
              </button>
            </div>
            <p
              className="whitespace-pre-wrap text-[12.5px] leading-snug text-av-text"
              style={k.erledigt ? { textDecoration: 'line-through' } : undefined}
            >
              {k.text}
            </p>
            {!k.antwortAuf && (
              <button
                type="button"
                className="av-focus mt-0.5 text-[11px] text-av-accent"
                onClick={() => setAntwortAuf(k.id)}
              >
                {t('kommentar.antworten', 'Antworten')}
              </button>
            )}
          </div>
        </div>
      ))}

      {identitaet && identitaet.name.trim() ? (
        <form
          className="flex flex-col gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            // Dieselbe Pruefung wie im Paket, damit die Flaeche nicht auf
            // eigene Rechnung entscheidet, was ein Kommentar ist.
            const r = schreibeKommentar({
              objektId,
              text,
              autor: identitaet,
              jetzt: Date.now(),
              id: 'probe',
              antwortAuf,
            })
            if (!r.ok) return
            onSchreiben(text, antwortAuf)
            setText('')
            setAntwortAuf(undefined)
          }}
        >
          {antwortAuf && (
            <div className="flex items-center gap-1 text-[11px] text-av-text-muted">
              <Icon name="redo" size={12} />
              {t('kommentar.antwortAuf', 'Antwort')}
              <button
                type="button"
                className="av-focus ml-1 text-av-accent"
                onClick={() => setAntwortAuf(undefined)}
              >
                {t('kommentar.antwortAbbrechen', 'nicht antworten')}
              </button>
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <span
              className="mt-0.5 grid h-5 w-5 flex-none place-items-center text-[9.5px] font-semibold"
              style={{ background: vollstaendig(identitaet).farbe, color: '#12161d' }}
              aria-hidden="true"
            >
              {vollstaendig(identitaet).initialen}
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Strg/Cmd+Enter schickt ab. Enter allein bricht die Zeile:
                // ein Kommentar ist oefter zwei Saetze als einer.
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.form?.requestSubmit()
              }}
              rows={2}
              placeholder={t('kommentar.platzhalter', 'Kommentar schreiben…')}
              aria-label={t('kommentar.platzhalter', 'Kommentar schreiben…')}
              className="av-focus min-w-0 flex-1 resize-none rounded-av-control border border-av-border bg-av-surface-3 px-2 py-1 text-[12.5px] text-av-text outline-none placeholder:text-av-text-faint"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="av-focus self-end rounded-av-control border border-av-border px-2 py-0.5 text-[12px] text-av-text hover:bg-av-surface-3"
            style={!text.trim() ? { opacity: 0.45 } : undefined}
          >
            {t('kommentar.senden', 'Kommentieren')}
          </button>
        </form>
      ) : (
        <p className="text-[11.5px] leading-snug text-av-text-muted">
          {format(
            t(
              'kommentar.ohneName',
              'Zum Kommentieren fehlt dein Name — {wo}. Eine Äusserung ohne Urheber wäre eine Notiz, und die gibt es schon.',
            ),
            { wo: t('kommentar.ohneNameWo', 'Einstellungen → Wer hier arbeitet') },
          )}
          {onEinstellungen && (
            <>
              {' '}
              <button type="button" className="av-focus text-av-accent underline" onClick={onEinstellungen}>
                {t('kommentar.zuDenEinstellungen', 'Öffnen')}
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}

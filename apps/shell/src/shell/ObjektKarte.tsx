import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Icon, Modal, type IconName } from '@avplan/ui'
import { useLanguage, useT, format, type TFunc } from '../i18n'
import {
  objektKandidaten,
  type HeimatModul,
  type ObjektAnzeige,
  type ObjektDa,
  type PlanAusschnitt,
} from '../data/boardObjekt'
import type { ObjektVerweis } from '../data/project'

/* Objekt-Karte des Boards (suite#259): ein Geraet oder Kabel des Plans.
 * Was hier steht, kommt aus `objektAnzeige` — die Karte selbst fuehrt nur
 * den Verweis. */

const ART: Record<HeimatModul, { icon: IconName }> = {
  cameras: { icon: 'camera' },
  licht: { icon: 'light' },
  signal: { icon: 'signal' },
}

const artLabel = (t: TFunc, a: ObjektDa): string =>
  a.art === 'kabel'
    ? t('board.object.kind.cable', 'Kabel')
    : a.modul === 'cameras'
      ? t('board.object.kind.camera', 'Kamera')
      : a.modul === 'licht'
        ? t('board.object.kind.fixture', 'Leuchte')
        : t('board.object.kind.device', 'Gerät')

const zeigenLabel = (t: TFunc, modul: HeimatModul): string =>
  modul === 'cameras'
    ? t('board.object.show.cameras', 'Im Kamera-Plan zeigen')
    : modul === 'licht'
      ? t('board.object.show.licht', 'Im Licht-Plan zeigen')
      : t('board.object.show.signal', 'Im Signal-Flow zeigen')

/** Die Fachzeile: was der Plan des Gewerks ueber das Objekt sagt. */
function fachzeile(t: TFunc, a: ObjektDa, zahl: (n: number) => string): string {
  if (a.art === 'kabel') {
    return [a.type, a.lengthM !== undefined ? `${zahl(a.lengthM)} m` : undefined].filter(Boolean).join(' · ')
  }
  if (a.kamera) {
    return [
      a.kamera.lens,
      a.kamera.focalMm !== undefined ? `${zahl(a.kamera.focalMm)} mm` : undefined,
      a.kamera.hfovDeg !== undefined ? `${zahl(a.kamera.hfovDeg)}°` : undefined,
    ].filter(Boolean).join(' · ')
  }
  if (a.licht) {
    const kanal = a.licht.dmxChannel
    const dmx = kanal === undefined
      ? undefined
      : a.licht.universe !== undefined
        ? format(t('board.object.dmxUniverse', 'DMX {universum}/{kanal}'), { universum: a.licht.universe, kanal })
        : format(t('board.object.dmx', 'DMX {kanal}'), { kanal })
    return [a.licht.purpose, dmx].filter(Boolean).join(' · ')
  }
  return a.sub ?? ''
}

export function ObjektKarte({
  anzeige,
  farbe,
  onZeigen,
}: {
  anzeige: ObjektAnzeige
  /**
   * Die Farbe der KARTE, nicht des Objekts: sie ist die Ordnung des Boards
   * („alles Gelbe ist offen") und steht deshalb an der Karte — als Lasur,
   * wie bei der Notiz.
   */
  farbe?: string
  onZeigen?: (modul: HeimatModul, id: string) => void
}) {
  const t = useT()
  const lang = useLanguage()
  const zahl = (n: number) =>
    new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 1 }).format(n)
  const lasur = farbe
    ? {
        background: `color-mix(in srgb, ${farbe} 14%, var(--av-surface-1))`,
        borderColor: `color-mix(in srgb, ${farbe} 55%, var(--av-border))`,
      }
    : undefined

  if (anzeige.status !== 'da') {
    // Sichtbar statt leer: die Karte war eine Aussage ueber genau dieses
    // Objekt, und wer sie liest, soll wissen, dass es fehlt — und welches.
    // Ohne geoeffneten Plan ist nichts verschwunden; das sagt die Karte auch
    // so und nicht in der Warnfarbe.
    const ref = anzeige.ref
    const weg = anzeige.status === 'weg'
    return (
      <div className="flex h-full w-full flex-col gap-1 border border-dashed border-av-border bg-av-surface-1 p-2.5" style={lasur}>
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-av-text-muted">
          <Icon name={weg ? 'warning' : 'nodes'} size={12} style={{ color: weg ? 'var(--av-warn)' : 'var(--av-text-muted)' }} />
          {t('board.type.object', 'Plan-Objekt')}
        </div>
        <div className={`text-[12.5px] font-semibold ${weg ? 'text-av-warn' : 'text-av-text-secondary'}`}>
          {weg
            ? t('board.object.gone', 'Objekt nicht mehr im Plan')
            : t('board.object.noPlan', 'Kein Plan geöffnet')}
        </div>
        <div className="truncate text-[11px] text-av-text-muted">
          {!ref
            ? t('board.object.noRef', 'Die Karte trägt keinen Verweis.')
            : format(
                weg
                  ? ref.art === 'kabel'
                    ? t('board.object.lastCable', 'zuletzt: Kabel {id}')
                    : t('board.object.lastDevice', 'zuletzt: Gerät {id}')
                  : ref.art === 'kabel'
                    ? t('board.object.refCable', 'zeigt auf: Kabel {id}')
                    : t('board.object.refDevice', 'zeigt auf: Gerät {id}'),
                { id: ref.id },
              )}
        </div>
      </div>
    )
  }

  const titel = anzeige.art === 'geraet' ? anzeige.name : anzeige.label
  const zweite = anzeige.art === 'geraet'
    ? [anzeige.model, anzeige.kategorie].filter(Boolean).join(' · ')
    : `${anzeige.von.name ?? format(t('board.object.endGone', '{id} (nicht im Plan)'), { id: anzeige.von.id })} → ${anzeige.nach.name ?? format(t('board.object.endGone', '{id} (nicht im Plan)'), { id: anzeige.nach.id })}`
  const fach = fachzeile(t, anzeige, zahl)

  return (
    <div className="flex h-full w-full flex-col gap-0.5 border border-av-border bg-av-surface-1 p-2.5" style={lasur}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-av-text-muted">
        <Icon name={anzeige.art === 'kabel' ? 'nodes' : ART[anzeige.modul].icon} size={12} style={{ color: 'var(--av-accent)' }} />
        {artLabel(t, anzeige)}
      </div>
      <div className="truncate text-[13px] font-semibold text-av-text" title={titel}>{titel}</div>
      {zweite && <div className="truncate text-[11px] text-av-text-muted" title={zweite}>{zweite}</div>}
      {fach && <div className="truncate text-[11px] text-av-text-secondary" title={fach}>{fach}</div>}
      {onZeigen && (
        <button
          type="button"
          className="av-focus mt-auto flex items-center gap-1 self-start text-[11px] text-av-accent hover:underline"
          // Der Knopf liegt auf der Zieh-Flaeche der Karte; ohne diesen
          // Abbruch finge jeder Klick ein Verschieben an.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onZeigen(anzeige.modul, anzeige.id) }}
        >
          {zeigenLabel(t, anzeige.modul)} <Icon name="external" size={12} />
        </button>
      )}
    </div>
  )
}

/**
 * Der Auswahl-Dialog: Geraete und Kabel des Plans, durchsuchbar.
 *
 * Er bietet NUR an, was im Plan steht. Ein freies Feld fuer eine Id waere
 * der Weg zu einer Karte, die von Anfang an auf nichts zeigt.
 */
export function ObjektWaehler({
  plan,
  onWahl,
  onClose,
}: {
  /** Fehlt, wenn kein Projekt offen ist — dann gibt es nichts zu verweisen. */
  plan?: PlanAusschnitt
  onWahl: (ref: ObjektVerweis) => void
  onClose: () => void
}) {
  const t = useT()
  const [suche, setSuche] = useState('')
  const eingabe = useRef<HTMLInputElement>(null)
  const treffer = useMemo(() => (plan ? objektKandidaten(plan, suche) : []), [plan, suche])
  const leer = !plan || (plan.geraete.length === 0 && plan.cables.length === 0)

  // Der Dialog setzt den Fokus auf sein erstes Bedienelement (das Schliessen-
  // Kreuz). Hier wird gesucht, also gehoert er ins Suchfeld — einen Takt
  // spaeter, damit er nach dem des Dialogs kommt.
  useEffect(() => {
    const uhr = window.setTimeout(() => eingabe.current?.focus(), 0)
    return () => window.clearTimeout(uhr)
  }, [])

  const gruppen: { titel: string; eintraege: typeof treffer }[] = [
    { titel: t('board.picker.devices', 'Geräte'), eintraege: treffer.filter((c) => c.ref.art === 'geraet') },
    { titel: t('board.picker.cables', 'Kabel'), eintraege: treffer.filter((c) => c.ref.art === 'kabel') },
  ].filter((g) => g.eintraege.length > 0)

  return (
    <Modal
      open
      onClose={onClose}
      title={t('board.picker.title', 'Plan-Objekt aufs Board legen')}
      footer={<Button variant="subtle" onClick={onClose}>{t('board.cancel', 'Abbrechen')}</Button>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border border-av-border bg-av-surface-3 px-2.5">
          <Icon name="search" size={14} style={{ color: 'var(--av-text-faint)' }} />
          <input
            ref={eingabe}
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            onKeyDown={(e) => {
              // Enter nimmt den ersten Treffer — bei einer eindeutigen Suche
              // ist das der Weg ohne Maus.
              if (e.key === 'Enter' && treffer[0]) onWahl(treffer[0].ref)
            }}
            placeholder={t('board.picker.search', 'Name, Modell, Kabeltyp …')}
            aria-label={t('board.picker.searchAria', 'Plan-Objekte durchsuchen')}
            className="av-focus w-full bg-transparent py-2 text-[13px] text-av-text outline-none placeholder:text-av-text-faint"
          />
        </div>
        {leer && (
          <p className="text-[13px] text-av-text-muted">
            {plan
              ? t('board.picker.empty', 'Im Plan steht noch nichts — kein Gerät und kein Kabel.')
              : t('board.picker.noPlan', 'Kein Projekt geöffnet — ohne Plan gibt es nichts, worauf eine Karte zeigen könnte.')}
          </p>
        )}
        {!leer && treffer.length === 0 && (
          <p className="text-[13px] text-av-text-muted">
            {format(t('board.picker.noHits', 'Keine Treffer für „{q}"'), { q: suche.trim() })}
          </p>
        )}
        <div className="av-scroll flex max-h-[50vh] flex-col gap-3 overflow-auto">
          {gruppen.map((g) => (
            <div key={g.titel}>
              <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-av-text-faint">{g.titel}</div>
              <div className="flex flex-col gap-1">
                {g.eintraege.map((c) => (
                  <button
                    key={`${c.ref.art}:${c.ref.id}`}
                    type="button"
                    className="av-focus flex flex-col items-start border border-transparent bg-av-surface-2 px-2.5 py-1.5 text-left hover:border-av-border"
                    onClick={() => onWahl(c.ref)}
                  >
                    <span className="text-[13px] font-medium text-av-text">{c.titel}</span>
                    {c.zeile && <span className="text-[11px] text-av-text-muted">{c.zeile}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

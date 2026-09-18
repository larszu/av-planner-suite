// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): was der Plan braucht — und was davon da ist.
//
// Diese Sicht ist der Grund, warum die Brücke keine halbe bleibt. Ein
// Datenweg ohne Bedienung ist genau der Befund, gegen den `oberflaecheErreichbar`
// steht: `seedAusBedarf` war gebaut, geprüft und von nichts aufgerufen.
//
// DIE ÜBERNAHME IST EIN KNOPF UND KEIN EFFEKT. Sie legt Lagerpositionen an und
// hebt Mengen; das ist ein Eingriff in den gezählten Bestand. Ein Seed kommt
// bei jeder Revision erneut — liefe sie von selbst, füllte ein Modulwechsel
// in der Shell das Lager mit Geräten, die nur geplant sind.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useShellBedarf } from '../lib/shellBedarfStore'
import { deckungAusBestand } from '../lib/shellSeed'

export function PlanBedarf() {
  const { t, format } = useT()
  const { zeilen, offen, roh, projekt } = useShellBedarf()
  const items = useInventoryStore((s) => s.items)
  const seedAusBedarf = useInventoryStore((s) => s.seedAusBedarf)

  const deckung = deckungAusBestand(roh, items)
  const nachKey = new Map(deckung.map((d) => [d.key, d]))

  if (roh.length === 0) {
    return (
      <section>
        <h2>{t('demand.head', 'Demand from the plan')}</h2>
        <p className="hinweis">
          {t(
            'demand.none',
            'No plan connected. This view fills up when the warehouse runs inside the suite and a project is open.',
          )}
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2>{t('demand.head', 'Demand from the plan')}</h2>
      <p className="hinweis">
        {projekt
          ? format(t('demand.from', 'What the plan "{name}" needs, against what is counted here.'), {
              name: projekt,
            })
          : t('demand.fromUnnamed', 'What the plan needs, against what is counted here.')}
      </p>

      <table>
        <thead>
          <tr>
            <th>{t('demand.model', 'Model')}</th>
            <th>{t('demand.needed', 'Needed')}</th>
            <th>{t('demand.covered', 'In stock')}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => {
            const d = nachKey.get(z.key)
            return (
              <tr key={z.key}>
                <td>{z.label}</td>
                <td>{z.quantity}</td>
                {/* „nicht gezählt" ist nicht „null vorhanden". Eine Zeile ohne
                    Lagerposition bekommt deshalb einen Satz und keine Zahl —
                    eine 0 hier wäre eine Zählung, die niemand gemacht hat. */}
                <td className={d?.gedeckt !== undefined && d.gedeckt < z.quantity ? 'befund nein' : undefined}>
                  {d?.gedeckt === undefined ? t('demand.uncounted', 'not counted') : d.gedeckt}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button type="button" onClick={() => seedAusBedarf(zeilen)} disabled={zeilen.length === 0}>
        {format(t('demand.take', 'Create missing positions ({n})'), { n: zeilen.length })}
      </button>

      {offen.length > 0 && (
        <p className="befund offen">
          {format(
            t(
              'demand.unknownModel',
              '{n} devices in the plan carry no model — they are not created as stock positions:',
            ),
            { n: offen.length },
          )}{' '}
          {offen.map((o) => o.label).join(', ')}
        </p>
      )}
    </section>
  )
}

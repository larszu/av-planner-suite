// ───────────────────────────────────────────────────────────────────────────
// SUITE-OVERLAY (nicht upstream): der Projekt-Seed der Shell im Lager.
//
// WARUM ES DAS GIBT. Das Lager stand seit `suite#99` als Modul 5 in der
// Leiste und war bis 2026-09-18 die einzige Fläche der Suite OHNE Datenweg:
// `seedAusBedarf` — laut CLAUDE.md „der einzige Schreibweg vom Plan hierher" —
// wurde von nichts ausser seinen eigenen Tests aufgerufen. Gemessen am
// 2026-09-18: kein Planer erzeugte je eine `BedarfsZeile`. Es war dieselbe
// Defektform wie B-18 („die Shell hört, aber niemand ruft"), eine Ebene höher.
//
// ZWEI RICHTUNGEN, UND SIE SIND NICHT SYMMETRISCH:
//
//   hinein   Der Bedarf des Plans kommt an und wird ANGEBOTEN, nicht
//            eingebucht. `seedAusBedarf` legt Lagerpositionen an und hebt
//            Mengen — das ist ein Eingriff in den gezählten Bestand, und der
//            gehört niemandem ausser dem Menschen davor. Ein Seed kommt bei
//            JEDER Revision erneut (Projektwechsel, Undo, Kopf-Änderung in der
//            Shell); liefe die Übernahme automatisch, füllte ein Modulwechsel
//            das Lager mit Geräten, die nur geplant sind.
//
//   hinaus   Die DECKUNG geht automatisch zurück. Sie ist eine Auskunft über
//            den vorhandenen Bestand und ändert nichts — dieselbe Asymmetrie
//            wie zwischen Lesen und Schreiben.
//
// WAS NICHT ZURÜCKGEHT, ist der Bedarf. Er ist eine Ableitung des Plans; das
// Lager darf ihn zeigen und decken, aber nicht umschreiben. Sonst hätte es
// eine Meinung darüber, was die Show braucht — die Grenze aus ADR-006 in der
// Gegenrichtung.
// ───────────────────────────────────────────────────────────────────────────
import type { SeedBedarf, SeedDeckung, SuiteSeed } from '@avplan/ui/embed'
import type { BedarfsZeile } from '../domain/types/bedarf'
import type { InventoryItem } from '../domain/types/inventory'

/**
 * Den Bedarf des Seeds in die Vertragsform des Lagers bringen.
 *
 * Zeilen mit `modellUnbekannt` fallen HERAUS. Der Plan sagt dort „ich kenne
 * das Modell dieses Geräts nicht" und schickt den Instanznamen („Kamera 1");
 * daraus eine Lagerposition zu machen, wäre genau der Fehler, den ADR-002 im
 * eigenen Baum gefunden hat — zwei Kameras desselben Typs werden zu zwei
 * Positionen à 1 Stück, und niemand kann später sagen, welche welche deckte.
 *
 * Sie verschwinden deshalb nicht still, sondern kommen als `offen` zurück:
 * das Lager zeigt sie als das, was sie sind — ein offener Punkt des Plans,
 * nicht eine Position des Bestands.
 */
export function bedarfAusSeed(seed: Pick<SuiteSeed, 'bedarf'>): {
  zeilen: BedarfsZeile[]
  offen: SeedBedarf[]
} {
  const zeilen: BedarfsZeile[] = []
  const offen: SeedBedarf[] = []

  for (const b of seed.bedarf) {
    if (b.modellUnbekannt) {
      offen.push(b)
      continue
    }
    zeilen.push({
      key: b.key,
      ...(b.deviceTypeId ? { deviceTypeId: b.deviceTypeId } : {}),
      label: b.label,
      ...(b.category ? { category: b.category } : {}),
      quantity: b.quantity,
      // `muster` bleibt WEG. Mietpreis, Lagerort, Lieferant und Eigentum sind
      // Stammdaten des Lagers; der Plan kennt sie nicht, und eine erfundene
      // Tagesmiete steht hinterher in einer Kalkulation.
    })
  }

  return { zeilen, offen }
}

/**
 * Wieviel der vorhandene Bestand von jeder Bedarfszeile deckt.
 *
 * `gedeckt` bleibt UNGESETZT, wenn zu einer Zeile keine Lagerposition
 * existiert. Das ist der Unterschied, auf dem dieses Repo besteht: „0
 * vorhanden" wäre eine Zählung, und niemand hat gezählt. Erst wenn eine
 * Position da ist, ist ihre Menge eine Aussage — auch die Menge 0.
 *
 * Getroffen wird über die Katalog-Id, sonst über Modell + Kategorie, in
 * dieser Reihenfolge: eine Id ist eine Angabe, ein Namensgleich eine
 * Vermutung (ADR-002). Dieselbe Reihenfolge benutzt `seedAusBedarf`, damit
 * die Deckung genau das misst, was die Übernahme anlegen würde.
 */
export function deckungAusBestand(
  bedarf: readonly SeedBedarf[],
  items: readonly InventoryItem[],
): SeedDeckung[] {
  const nachTyp = new Map<string, number>()
  const nachName = new Map<string, number>()
  for (const it of items) {
    if (it.deviceTypeId) nachTyp.set(it.deviceTypeId, (nachTyp.get(it.deviceTypeId) ?? 0) + it.quantity)
    const name = namensSchluessel(it.model, it.category)
    nachName.set(name, (nachName.get(name) ?? 0) + it.quantity)
  }

  return bedarf.map((b) => {
    // Eine Zeile ohne Modell ist über keinen der beiden Wege zu treffen: ihr
    // `label` ist ein Instanzname. Sie bekommt deshalb keine Deckung, nicht
    // die Deckung 0.
    const gedeckt = b.modellUnbekannt
      ? undefined
      : ((b.deviceTypeId ? nachTyp.get(b.deviceTypeId) : undefined) ??
        nachName.get(namensSchluessel(b.label, b.category)))

    return {
      key: b.key,
      benoetigt: b.quantity,
      ...(gedeckt === undefined ? {} : { gedeckt }),
    }
  })
}

/**
 * Derselbe Schlüssel, den `dedupeKey` im Store bildet — bewusst hier
 * nachgebaut statt importiert, weil diese Datei eine Suite-Überlagerung ist
 * und der Store upstream liegt. Weicht der Store ab, weicht die Deckung von
 * der Übernahme ab; `shellSeed.test.ts` hält beide gegeneinander.
 */
const namensSchluessel = (model: string, category?: string): string =>
  `${model.trim().toLowerCase()}|${(category ?? '').trim().toLowerCase()}`

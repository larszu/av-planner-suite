// ───────────────────────────────────────────────────────────────────────────
// Eigentum je Feld — die Konfliktregel des Seed-Protokolls (E-21).
//
// WARUM ES DAS GIBT. E-22 hat entschieden, dass die Zuordnung Kamera →
// Bedienfeld → Multiviewer → Tally ein GETEILTES Objekt ist: alle lesen und
// alle schreiben es. Damit wurde „wer gewinnt" von einer Randfrage zur ersten.
// Dieselbe Frage stand laenger schon an B-39, Punkt 1: der Raum geht nur hin
// und nie zurueck, weil MultiCam und Licht ihn beide bearbeiten und die
// Zusammenfuehrung eine Regel braucht. Statt einer Regel gab es einen
// weggelassenen Rueckweg — der Widerspruch war vermieden, indem eine Haelfte
// der Verbindung fehlte.
//
// DIE REGEL, in zwei Stufen (E-21, 2026-09-08, vom Eigentuemer bestaetigt):
//
//   1. EIGENTUM JE FELD. Jedes Feld hat genau eine schreibende Stelle. Die
//      Schreibung einer anderen ist ein VORSCHLAG, keine Aenderung. Damit
//      verschwindet der Konflikt fuer den groessten Teil der Felder, statt
//      geloest zu werden: die Kameras gehoeren dem Kamera-Planer, die Leuchten
//      dem Licht-Planer, der Signalfluss dem Kabel-Planer — getrennt schon
//      ueber `SeedPatch.domain`.
//
//   2. GETEILTE FELDER MELDEN DEN WIDERSPRUCH. Fuer die wenigen Felder, die
//      mehrere schreiben duerfen (heute die drei Raum-Masse), traegt jeder
//      Eintrag Herkunft und Zeitpunkt. Wer ein Feld zuerst setzt, HAELT es;
//      eine abweichende Setzung einer anderen Stelle wird zu einem BEFUND und
//      nicht zu einer Ueberschreibung.
//
// WARUM NICHT „LETZTER GEWINNT". Das waere die scheinbar einfachste Regel und
// die schlechteste: sie macht aus einem Widerspruch ein Rennen, dessen Ausgang
// von der Netzlaufzeit abhaengt. Beide Seiten saehen fuer sich vollstaendig
// aus, und der zuletzt zurueckmeldende Planer gewaenne still — genau die Form,
// gegen die ADR-003 geschrieben ist. Der Zeitstempel steht deshalb IM BEFUND
// und entscheidet ihn nicht.
//
// WARUM GLEICHER WERT KEIN BEFUND IST. Zwei Planer, die dieselbe Halle
// vermessen und auf dieselbe Zahl kommen, widersprechen sich nicht — sie
// bestaetigen sich. Ein Befund an dieser Stelle waere Laerm, und Laerm macht
// die echten Befunde unsichtbar.
// ───────────────────────────────────────────────────────────────────────────

import { imPlan, type SeedGeraet } from './geraet'
import type {
  SeedDomain,
  SeedHold,
  SeedPatch,
  SeedSharedField,
  SeedVenue,
  SeedWriter,
  SuiteSeed,
} from './seed'

/** Feldpfad im Seed, so wie er im Befund steht. */
export type SeedVenueField = `venue.${keyof SeedVenue}`

/**
 * Wer welches Raum-Feld schreiben darf. `'shared'` heisst: mehrere duerfen,
 * und dann gilt Stufe 2 der Regel.
 *
 * `satisfies Record<keyof SeedVenue, …>` ist hier die eigentliche Zusicherung:
 * ein neues Feld in `SeedVenue`, das niemand hier eintraegt, ist ein
 * TYP-FEHLER und keine stille Luecke. Ohne das waere die Tabelle der
 * Kenntnisstand ihres Autors am Tag des Hinschreibens — und ein Feld, das
 * durch keine Regel laeuft, wird stillschweigend ueberschrieben.
 */
export const SEED_VENUE_OWNER = {
  // Der Name des Hauses steht im Shell-Projekt (`meta.venue`) und wird dort
  // gepflegt. Ein Planer, der ihn abweichend mitschickt, macht einen
  // Vorschlag — und der wird gemeldet, nicht ausgefuehrt.
  name: 'shell',
  // Die Masse vermessen beide Planer: MultiCam fuer die Sichtlinien, Licht
  // fuer die Rigging-Punkte.
  widthM: 'shared',
  heightM: 'shared',
  stage: 'shared',
} satisfies Record<keyof SeedVenue, SeedWriter | 'shared'>

/** Feldpfad → Schluessel in `SeedVenue`. Vollstaendig, damit kein Pfad ins Leere zeigt. */
const VENUE_PFAD = {
  'venue.name': 'name',
  'venue.widthM': 'widthM',
  'venue.heightM': 'heightM',
  'venue.stage': 'stage',
} satisfies Record<SeedVenueField, keyof SeedVenue>

/**
 * Ein Widerspruch, der NICHT ueberschrieben wurde. Das ist die Ausgabe der
 * Regel, nicht ihr Nebenprodukt: ein Aufrufer, der ihn wegwirft, hat „letzter
 * gewinnt" wieder eingebaut, nur umgekehrt herum.
 */
export interface SeedConflict {
  field: SeedVenueField
  /**
   * Der Wert, der stehen bleibt — und wer ihn haelt. `at` fehlt bei einem
   * statisch besessenen Feld: dort gibt es keine Setzung, die jemand
   * gestempelt haette, und eine erfundene 0 saehe aus wie „1970".
   */
  held: { value: unknown; by: SeedWriter; at?: number }
  /** Der Wert, der vorgeschlagen wurde — und von wem. */
  proposed: { value: unknown; by: SeedWriter; at: number }
}

export interface SeedMerge {
  seed: SuiteSeed
  /** Leer heisst: nichts zu melden. Nicht „nichts passiert". */
  conflicts: SeedConflict[]
}

/**
 * Wertgleichheit fuer Seed-Felder. Zahlen und Zeichenketten direkt, `stage`
 * ueber seine vier Zahlen — bewusst nicht ueber `JSON.stringify`, dessen
 * Ergebnis von der Schluessel-Reihenfolge abhaengt und damit zwei gleiche
 * Rechtecke als verschieden melden koennte, je nachdem, welcher Planer sie
 * gebaut hat.
 */
function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a === 'object' && typeof b === 'object') {
    const x = a as Record<string, unknown>
    const y = b as Record<string, unknown>
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (!gleich(x[k], y[k])) return false
    }
    return true
  }
  return false
}

const istGeteilt = (pfad: SeedVenueField): pfad is SeedSharedField =>
  SEED_VENUE_OWNER[VENUE_PFAD[pfad]] === 'shared'

/**
 * Eine Rueckmeldung in den Seed einarbeiten — nach Eigentum je Feld.
 *
 * Domaenen-Listen (`cameras`, `fixtures`, `devices`/`cables`) gehoeren je
 * genau einer App; sie werden ersetzt wie bisher, und ein Widerspruch kann
 * dort gar nicht entstehen. Der Raum laeuft durch die Regel.
 *
 * Die Revision bleibt stehen: die Aenderung kommt aus einem Planer, der
 * bereits auf diesem Stand aufsetzte, und darf kein erneutes Befuellen
 * ausloesen (Echo-Schleife).
 */
export function mergeSeedPatch(seed: SuiteSeed, patch: SeedPatch): SeedMerge {
  if (patch.revision !== seed.revision) return { seed, conflicts: [] }

  const conflicts: SeedConflict[] = []
  let naechster = seed

  // ── Der Raum: das einzige Geteilte, also durch die Regel ─────────────────
  if (patch.venue) {
    const schreiber: SeedWriter = patch.domain
    const at = patch.at ?? 0
    let venue = seed.venue
    let holds = seed.holds
    let geaendert = false

    for (const [pfad, feld] of Object.entries(VENUE_PFAD) as [SeedVenueField, keyof SeedVenue][]) {
      const vorschlag = patch.venue[feld]
      // `undefined` heisst „keine Aussage", nicht „leeren". Ein Planer, der
      // ein Feld nicht kennt, darf es nicht loeschen.
      if (vorschlag === undefined) continue
      const bisher = venue[feld]

      if (!istGeteilt(pfad)) {
        // Stufe 1: das Feld hat genau einen Eigentuemer.
        const eigner = SEED_VENUE_OWNER[feld] as SeedWriter
        if (eigner === schreiber) {
          if (!gleich(bisher, vorschlag)) {
            venue = { ...venue, [feld]: vorschlag }
            geaendert = true
          }
        } else if (!gleich(bisher, vorschlag)) {
          // Ein Vorschlag von aussen, und er widerspricht. Ohne diese Meldung
          // waere „gehoert der Shell" eine Behauptung, die niemand pruefen
          // kann — und der Planer saehe seine Korrektur verschwinden.
          conflicts.push({
            field: pfad,
            held: { value: bisher, by: eigner },
            proposed: { value: vorschlag, by: schreiber, at },
          })
        }
        continue
      }

      // Stufe 2: geteilt — wer zuerst setzt, haelt.
      const halter = seed.holds?.[pfad]
      if (halter && halter.by !== schreiber && !gleich(bisher, vorschlag)) {
        conflicts.push({
          field: pfad,
          held: { value: bisher, by: halter.by, at: halter.at },
          proposed: { value: vorschlag, by: schreiber, at },
        })
        continue
      }
      if (!gleich(bisher, vorschlag)) {
        venue = { ...venue, [feld]: vorschlag }
        geaendert = true
      }
      if (!halter) {
        // Erste Setzung: der Schreiber bekommt das Feld. Bestaetigt jemand
        // spaeter denselben Wert, wechselt der Halter NICHT — Zustimmung ist
        // keine Uebernahme.
        const neu: SeedHold = { by: schreiber, at }
        holds = { ...holds, [pfad]: neu }
        geaendert = true
      } else if (halter.by === schreiber && halter.at !== at) {
        holds = { ...holds, [pfad]: { by: schreiber, at } }
        geaendert = true
      }
    }

    if (geaendert) naechster = { ...naechster, venue, holds }
  }

  // ── Die Geraeteliste: Eigentum je FELDGRUPPE ─────────────────────────────
  //
  // Bis 2026-09-19 stand hier ein `switch`, der drei getrennte Listen
  // ersetzte: `cameras`, `fixtures`, `devices`. Das war die Regel, die das
  // Drei-Listen-Modell ueberhaupt noetig machte — sie brauchte Listen, um zu
  // greifen, und wer Listen braucht, baut Listen (ADR-011).
  //
  // Jetzt gibt es EINE Liste, und die Regel wird feiner statt schwaecher:
  //
  //   `signal`   schreibt die gemeinsamen Felder und die Lage im Diagramm
  //   `cameras`  schreibt die Gruppe `kamera` und die Lage im Raum
  //   `fixtures` schreibt die Gruppe `licht` und die Lage im Raum
  //
  // Was einem Planer nicht gehoert, kann er nicht ueberschreiben — dieselbe
  // Zusicherung wie vorher, nur eine Ebene genauer. Die Brennweite gehoert
  // dem Kameraplan, die DMX-Adresse dem Lichtplan, die Ports dem Signalplan.
  const gemeldet = geraeteAusPatch(patch)
  if (gemeldet) {
    const jeId = new Map(naechster.geraete.map((g) => [g.id, g]))
    const geraete: SeedGeraet[] = []
    const gesehen = new Set<string>()

    for (const neu of gemeldet) {
      gesehen.add(neu.id)
      const alt = jeId.get(neu.id)
      geraete.push(alt ? nurEigenes(alt, neu, patch.domain) : neu)
    }

    // Was der Melder NICHT genannt hat, bleibt stehen — es sei denn, es
    // gehoert ihm. Ein Kameraplan, der drei Kameras meldet, hat damit nichts
    // ueber den Mischer gesagt; ein Signalplan, der den Mischer loescht,
    // schon.
    for (const g of naechster.geraete) {
      if (gesehen.has(g.id)) continue
      if (!gehoertDomaene(g, patch.domain)) geraete.push(g)
    }

    // Seit Stufe 4 gibt es nichts mehr nachzufuehren: die drei Sichten sind
    // aus dem Seed verschwunden, und wer sie braucht, filtert die eine Liste.
    naechster = { ...naechster, geraete }
  }

  // Kabel gehoeren dem Signalplan und liegen NEBEN der Geraeteliste: sie
  // verbinden zwei Geraete, sind aber keines. Beim Umbau auf die eine Liste
  // fielen sie am 2026-09-19 kurzzeitig heraus — der Test „nimmt bei signal
  // Geraete und Kabel zusammen" hat es gemeldet, bevor es jemand im Plan
  // bemerkt haette.
  if (patch.domain === 'signal' && patch.cables) {
    naechster = { ...naechster, cables: patch.cables }
  }

  switch (patch.domain) {
    case 'lager':
      // Das Lager meldet die Deckung und sonst nichts. Es besitzt keine
      // Plan-Liste: wuerde es `devices` mitschicken duerfen, haette es eine
      // Meinung darueber, was der Plan enthaelt — die Grenze aus ADR-006 in
      // der Gegenrichtung. `bedarf` bleibt aus demselben Grund aussen vor; er
      // ist eine Ableitung des Plans und kommt beim naechsten Senden neu.
      if (patch.deckung) naechster = { ...naechster, deckung: patch.deckung }
      break
    case 'gebaeude':
      // Das Gebaeude meldet seine Anschlusspunkte. Es ist die einzige Quelle
      // dafuer: ein Planer, der sie mitschickte, haette eine Meinung ueber die
      // Hausinstallation statt sie nachzulesen.
      if (patch.anschluesse) naechster = { ...naechster, anschluesse: patch.anschluesse }
      break
    default:
      break
  }

  return { seed: naechster, conflicts }
}

/**
 * Einen Befund aufloesen, indem der Vorschlag angenommen wird: der Wert zieht
 * ein, und bei einem geteilten Feld wechselt der Halter zum Vorschlagenden.
 * Das ist die einzige Art, wie ein gehaltenes Feld die Stelle wechselt —
 * ausdruecklich und von Hand.
 *
 * Bei einem statisch besessenen Feld bleibt der Eigentuemer, wer er ist: der
 * Wert aendert sich, die Zustaendigkeit nicht. Sonst haette ein Planer sich
 * ueber einen angenommenen Vorschlag den Raum-Namen aneignen koennen.
 */
export function acceptProposal(seed: SuiteSeed, conflict: SeedConflict): SuiteSeed {
  const feld = VENUE_PFAD[conflict.field]
  const venue = { ...seed.venue, [feld]: conflict.proposed.value }
  if (!istGeteilt(conflict.field)) return { ...seed, venue }
  return {
    ...seed,
    venue,
    holds: { ...seed.holds, [conflict.field]: { by: conflict.proposed.by, at: conflict.proposed.at } },
  }
}

/** Kurzform fuer die Anzeige: `venue.widthM` → `widthM`. */
export const conflictFieldName = (field: SeedVenueField): keyof SeedVenue => VENUE_PFAD[field]


// ───────────────────────────────────────────────────────────────────────────
// WER WAS SCHREIBEN DARF — die Regel als Code, nicht als Kommentar
// ───────────────────────────────────────────────────────────────────────────

/** Die Domaenen, die ueberhaupt einen Plan fuehren. */
const PLAN_DOMAENEN: readonly SeedDomain[] = ['signal', 'cameras', 'fixtures']

/**
 * Die gemeldete Liste dieser Domaene.
 *
 * Seit Stufe 4 ist das fast eine Zeile: alle Planer melden `geraete`. Hier
 * stand bis dahin die Uebersetzung der drei alten Sichten — sie ist mit ihnen
 * weggefallen, und zwar vollstaendig. Eine Uebersetzung, die niemand mehr
 * braucht, ist ein Weg, den beim naechsten Umbau jemand wiederbelebt.
 *
 * Was NICHT weggefallen ist, ist die Grenze aus ADR-006: Lager und Gebaeude
 * fuehren keinen Plan. Sie melden ihr eigenes Fach (`deckung`, `anschluesse`)
 * und haben ueber die Geraete der Show keine Meinung. Bis diese Zeile stand,
 * hatten sie eine — solange sie `geraete` mitschickten, wurde die Liste
 * eingearbeitet wie die eines Planers, und ein Lager konnte den Plan leeren.
 * Gefunden 2026-09-19 beim Umbau auf die eine Liste: der Test dafuer stand
 * bereits, er prueft nur nicht mehr `devices`.
 */
function geraeteAusPatch(patch: SeedPatch): SeedGeraet[] | undefined {
  if (!PLAN_DOMAENEN.includes(patch.domain)) return undefined
  return patch.geraete
}

/**
 * Darf diese Domaene ein Geraet ENTFERNEN, das sie nicht mehr meldet?
 *
 * Nur, wenn es in ihrem Plan steht. Der Kameraplan, der zwei statt drei
 * Kameras meldet, hat eine geloescht; derselbe Kameraplan sagt damit nichts
 * ueber den Mischer, den er gar nicht zeigt.
 */
function gehoertDomaene(g: SeedGeraet, domain: SeedDomain): boolean {
  if (domain === 'signal') return imPlan(g, 'signal')
  if (domain === 'cameras') return imPlan(g, 'kamera')
  if (domain === 'fixtures') return imPlan(g, 'licht')
  return false
}

/**
 * Den gemeldeten Stand einarbeiten — aber nur die Felder, die dem Melder
 * gehoeren.
 *
 * DAS IST DIE STELLE, AN DER DIE ZUSICHERUNG HAENGT. Ohne sie wuerde eine
 * Meldung des Kameraplans die DMX-Adresse einer Leuchte loeschen, sobald
 * jemand drueben etwas anfasst — und niemand saehe, wann es passierte.
 */
/**
 * Das Fach DIESER Domaene einarbeiten — und jedes andere unangetastet lassen
 * (ADR-013).
 *
 * Die Regel in einem Satz: ein Melder ERSETZT sein eigenes Fach und TRAEGT
 * alle uebrigen. Ersetzen und nicht mischen, weil nur er weiss, was ein
 * geloeschtes Feld in seinem Fach bedeutet; tragen und nicht mischen, weil er
 * ueber die fremden nichts weiss — auch nicht, ob sie noch gelten.
 *
 * Meldet er kein Fach, bleibt seines stehen. „Nichts gesagt" ist keine
 * Loeschung; genau daran ist die Ausrichtung der Kameras bis 2026-09-19
 * verlorengegangen, eine Ebene hoeher.
 */
function fachdatenZusammen(
  alt: SeedGeraet,
  neu: SeedGeraet,
  domain: SeedDomain,
): Pick<SeedGeraet, 'fachdaten'> {
  const eigenes = neu.fachdaten?.[domain]
  if (!alt.fachdaten && !eigenes) return {}
  const zusammen = { ...alt.fachdaten, ...(eigenes ? { [domain]: eigenes } : {}) }
  return { fachdaten: zusammen }
}

function nurEigenes(alt: SeedGeraet, neu: SeedGeraet, domain: SeedDomain): SeedGeraet {
  if (domain === 'signal') {
    // Der Signalplan fuehrt das Geraet als solches: Name, Beschriftung,
    // Modell, Kategorie, Lage im Diagramm. Die Fachgruppen fasst er nicht an.
    //
    // DIE LAGE IM RAUM nur dort, wo sie niemand sonst fuehrt. Kamera und
    // Leuchte stellt ihr Plan in den Raum — dort ist die Stelle gemessen
    // (Sichtlinie, Haengepunkt), und ein Knoten auf dem Hallenplan des
    // Signalplans ist dagegen eine Skizze. Mischer, Kreuzschiene und Switch
    // stellt dagegen KEIN anderer Plan irgendwohin: ohne diesen Weg standen
    // sie in „Raum in 3D" fuer immer unter „nicht platziert", auch wenn sie
    // im Signalplan auf dem vermessenen Hallenplan lagen.
    //
    // Nur BEIDE Zahlen zusammen, und `undefined` loescht nicht (wie beim
    // Raum): ein Signalplan ohne Massstab hat ueber die Lage nichts gesagt.
    const { kamera, licht, x, y, fachdaten, ...rest } = neu
    void kamera
    void licht
    void fachdaten
    const raumFrei = !imPlan(alt, 'kamera') && !imPlan(alt, 'licht')
    return {
      ...alt,
      ...rest,
      ...(raumFrei && x !== undefined && y !== undefined ? { x, y } : {}),
      ...fachdatenZusammen(alt, neu, domain),
    }
  }
  if (domain === 'cameras') {
    return {
      ...alt,
      // Name und Modell gehoeren dem fuehrenden Plan; der Kameraplan darf sie
      // setzen, wenn er sie nennt, aber nicht leeren.
      ...(neu.name ? { name: neu.name } : {}),
      ...(neu.model !== undefined ? { model: neu.model } : {}),
      // Die Katalog-Identitaet wie `model`: setzen darf sie, wer sie nennt —
      // der Kameraplan kennt den Typ seiner Kamera oft genauer als der
      // Signalplan —, leeren darf sie niemand nebenbei (ADR-012).
      ...(neu.typId !== undefined ? { typId: neu.typId } : {}),
      ...(neu.x !== undefined ? { x: neu.x } : {}),
      ...(neu.y !== undefined ? { y: neu.y } : {}),
      // Die leere Gruppe waere eine AUSSAGE: `kamera: {}` heisst „steht im
      // Kameraplan" (siehe `imPlan`). Ein Kameraplan, der ein fremdes Geraet
      // nur miterwaehnt, zoege es damit in seinen Plan — deshalb entsteht die
      // Gruppe nur, wo schon eine ist oder wo er etwas dazu sagt.
      ...(alt.kamera || neu.kamera ? { kamera: { ...alt.kamera, ...neu.kamera } } : {}),
      ...fachdatenZusammen(alt, neu, domain),
    }
  }
  if (domain === 'fixtures') {
    return {
      ...alt,
      ...(neu.name ? { name: neu.name } : {}),
      ...(neu.model !== undefined ? { model: neu.model } : {}),
      // Die Katalog-Identitaet wie `model`: setzen darf sie, wer sie nennt —
      // der Kameraplan kennt den Typ seiner Kamera oft genauer als der
      // Signalplan —, leeren darf sie niemand nebenbei (ADR-012).
      ...(neu.typId !== undefined ? { typId: neu.typId } : {}),
      ...(neu.x !== undefined ? { x: neu.x } : {}),
      ...(neu.y !== undefined ? { y: neu.y } : {}),
      // Siehe oben: die leere Gruppe ist die Zuordnung zum Lichtplan.
      ...(alt.licht || neu.licht ? { licht: { ...alt.licht, ...neu.licht } } : {}),
      ...fachdatenZusammen(alt, neu, domain),
    }
  }
  return alt
}

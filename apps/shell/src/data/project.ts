/**
 * Seed-Projektmodell der Shell — ein in sich stimmiger Demo-Stand
 * („Sommershow 2026 · Halle A"), der Bibliotheks-Panels, Vorschauen,
 * Eigenschaften und Statusleiste mit echten, konsistenten Zahlen speist.
 * Das ist bewusst Anschauungs-Datenmodell der Shell selbst — die
 * eigentlichen Projektdaten leben in den eingebetteten Planern.
 */

import { imPlan } from '@avplan/ui/embed'
import { CONTAINER_KINDS, type InventoryItem, type StorageNode } from '@avplan/inventory-core'

export interface ProjectMeta {
  name: string
  venue: string
  version: number
  saved: boolean
}

/** Produktionsphase — grob wie in Rentman/Production Planner (Status der Show). */
export type ShowPhase = 'planning' | 'setup' | 'show' | 'teardown'

export type Department = 'video' | 'light' | 'audio' | 'prod'

/** Ein Punkt im Tagesablauf (Run of Show / Day Sheet). */
export interface ScheduleItem {
  time: string
  title: string
  dept: Department | 'all'
}

/** Crew-Mitglied mit Gewerk, Call-Time und Status (Production Planner/Rentman). */
export interface CrewMember {
  name: string
  role: string
  dept: Department
  call: string
  status: 'confirmed' | 'pending'
}

/** Budgetzeile: geschätzt vs. tatsächlich pro Kategorie (Production Planner). */
export interface BudgetLine {
  category: string
  estimatedEur: number
  actualEur: number
}

export interface LogisticsInfo {
  vehicles: { label: string; detail: string }[]
  loadIn: string
  distanceKm: number
}

export interface Contact {
  name: string
  role: string
  org: string
  phone: string
  /* ── Rechnungs-/Fakturierungsfelder (optional, für Lexware Office) ── */
  /** Als Rechnungs-/Angebots-Empfänger markiert. */
  billTo?: boolean
  email?: string
  street?: string
  zip?: string
  city?: string
  /** ISO-3166-alpha-2, Default 'DE'. */
  countryCode?: string
  /** USt-IdNr. */
  vatId?: string
  customerNumber?: string
  /** UUID eines bereits in Lexware Office angelegten Kontakts. */
  lexofficeContactId?: string
}

/**
 * Belegkopf-Voreinstellungen fürs Fakturieren (Lexware Office). Liegt am Projekt,
 * damit Angebot/Rechnung reproduzierbar aus dem Projekt erzeugt werden können.
 */
export interface BillingSettings {
  /** Besteuerung: netto / brutto / steuerfrei (Kleinunternehmer §19). */
  taxType: 'net' | 'gross' | 'vatfree'
  /** Standard-Steuersatz für abgeleitete Positionen. */
  taxRatePercent: 0 | 7 | 19
  /** Miettage als Kalkulationsbasis für Inventar-Positionen. */
  rentalDays: number
  /** Zahlungsziel in Tagen (Rechnung). */
  paymentTermDays: number
  /** Angebots-Gültigkeit in Tagen ab Belegdatum. */
  quoteValidDays: number
  /** Optionaler Einleitungstext. */
  introduction?: string
  /** Optionaler Schlusstext/Bemerkung. */
  remark?: string
}

export interface ProjectTask {
  title: string
  done: boolean
  due?: string
  owner?: string
}

/* ── Board (Milanote-artiges Kreativ-Canvas) ───────────────────────────────*/

export type BoardCardType =
  | 'heading'
  | 'note'
  | 'link'
  | 'todo'
  | 'color'
  | 'look'
  | 'column'
  | 'board'
  | 'image'
  /** Ein Film — spielt auf der Karte, mit Bedienleiste. */
  | 'video'
  /** Eine Tonaufnahme — Sprachnotiz, Mitschnitt, Musik. */
  | 'audio'
  /** Alles andere: PDF, Textdokument, Tabelle, Zeichnung. */
  | 'file'

/** Eine Karte auf dem Board (frei positioniert oder in einer Spalte). */
export interface BoardCard {
  id: string
  type: BoardCardType
  x: number
  y: number
  w: number
  title?: string
  text?: string
  url?: string
  /** Farbe für color-/look-Karten (look rendert daraus einen Verlauf). */
  color?: string
  /**
   * Die Punkte einer To-do-Karte.
   *
   * `owner` ist der NAME eines Crew-Mitglieds dieses Projekts und keine
   * freie Zeichenkette mit Personencharakter: „Aufgaben verteilen" heisst,
   * sie jemandem zu geben, den es gibt. Wer nicht in der Crew steht,
   * bekommt hier keine Aufgabe — und wer aus der Crew verschwindet, laesst
   * seinen Namen an der Aufgabe stehen, statt sie still herrenlos zu
   * machen.
   */
  items?: { text: string; done: boolean; owner?: string }[]
  /** Wenn gesetzt: Karte liegt in dieser Spalte (Container), nicht frei. */
  columnId?: string
  /** Für type 'board': das verschachtelte Unterboard (Board in Board). */
  board?: Board
  /** Für type 'image': Bilddaten als data-URL (offline-tauglich, persistierbar). */
  src?: string
  /** Für type 'image': Seitenverhältnis Breite/Höhe (für die Karten-Höhe). */
  ratio?: number
  /**
   * Der Name der Datei, aus der diese Karte entstanden ist.
   *
   * Er steht NEBEN dem Titel: der Titel ist, was jemand hingeschrieben hat,
   * der Dateiname ist, was auf der Platte lag. Wer den Titel ändert, hat die
   * Datei nicht umbenannt.
   */
  fileName?: string
  /** Größe in Bytes, wie sie beim Ablegen gemessen wurde. */
  fileSize?: number
  /** MIME-Typ, unverändert wie ihn der Browser gemeldet hat. */
  fileType?: string
  /**
   * Ist der Inhalt im Projekt enthalten?
   *
   * `false` heisst: die Karte KENNT die Datei, trägt sie aber nicht — sie war
   * größer als `EINBETT_GRENZE`. Das ist eine Aussage und kein Defekt, und
   * sie steht auf der Karte, damit niemand die Datei beim nächsten Öffnen
   * vermisst, ohne zu wissen warum.
   *
   * Fehlt das Feld bei einer Karte mit `src`, ist der Inhalt da — so sind
   * alle Bild-Karten entstanden, die es vor diesem Feld schon gab.
   */
  embedded?: boolean
  /**
   * Standzeit dieser Einstellung in Sekunden, wenn das Board als Film läuft.
   *
   * Nur `image` und `look` tragen sie — eine Notiz ist keine Einstellung.
   * FEHLT SIE, ist sie nicht null: dann gilt die Vorgabe des Boards. Eine
   * hier gespeicherte Null hiesse „wird uebersprungen", und das ist eine
   * andere Aussage als „hat noch niemand festgelegt".
   */
  durationS?: number
}

export interface BoardConnection {
  id: string
  from: string
  to: string
  /**
   * Trägt die Verbindung eine Pfeilspitze?
   *
   * Der Unterschied ist eine AUSSAGE und keine Verzierung: eine Linie sagt
   * „das gehört zusammen", ein Pfeil sagt „daraus folgt das". Auf einem
   * Board, das eine Kampagne oder einen Signalweg skizziert, ist das nicht
   * dasselbe.
   *
   * Fehlt das Feld, ist es ein Pfeil — so waren alle Verbindungen gemeint,
   * die es vor diesem Feld schon gab, und sie wurden auch so gezeichnet.
   */
  plain?: boolean
}

export interface Board {
  cards: BoardCard[]
  connections: BoardConnection[]
  /**
   * Das Bildformat, in dem dieses Board gedacht ist.
   *
   * Es gehoert ans BOARD und nicht an die Karte: ein Storyboard hat EIN
   * Format, und Einstellungen in drei Seitenverhaeltnissen nebeneinander
   * sind kein Storyboard, sondern eine Sammlung. Die Bildgrenzen werden
   * darueber gezeichnet, statt die Bilder zu beschneiden — was drumherum
   * liegt, ist die Information, die beim Schneiden gebraucht wird.
   *
   * Fehlt es, zeichnet nichts eine Grenze. Kein Format ist nicht 16:9.
   */
  format?: BoardFormat
  /** Vorgabe-Standzeit je Einstellung in Sekunden. Fehlt sie, gilt DEFAULT_SHOT_S. */
  shotSeconds?: number
}

/**
 * Die Bildformate, die dieses Haus dreht.
 *
 * Eine Aufzaehlung und kein freies Zahlenpaar: ein Format ist ein NAME, den
 * am Set jemand ausspricht, und „2.39:1" laesst sich mit einem Bildwerfer
 * abgleichen, `2.3866` nicht.
 */
export type BoardFormat = '16:9' | '2.39:1' | '2:1' | '4:3' | '1:1' | '9:16'

/**
 * Bis hierher wandert eine abgelegte Datei MIT ins Projekt.
 *
 * ─── WARUM ES EINE GRENZE GIBT ──────────────────────────────────────────
 *
 * Eine eingebettete Datei liegt als data-URL im Projekt, und das Projekt
 * geht in den lokalen Speicher, in eine Datei und über den Seed an die
 * Planer. Ein 400-MB-Mitschnitt darin macht das Projekt unspeicherbar —
 * und zwar erst beim Speichern, also lange nachdem jemand ihn abgelegt hat.
 *
 * ─── WARUM SIE NICHT STILL ABLEHNT ──────────────────────────────────────
 *
 * Über der Grenze entsteht die Karte trotzdem, mit Name, Größe und Typ,
 * und sie sagt auf dem Bild, dass der Inhalt nicht dabei ist. Eine
 * verschluckte Datei wäre die schlechtere Antwort: wer sie ablegt, hat
 * eine Absicht, und die gehört aufs Board, auch wenn der Inhalt dort nicht
 * hinpasst.
 *
 * 8 MiB ist die Größe, bei der ein Projekt mit einem Dutzend solcher
 * Karten noch in den lokalen Speicher passt (dessen übliche Grenze bei
 * 5–10 MB je Ursprung liegt, weshalb grosse Projekte ohnehin in eine Datei
 * gehören).
 */
export const EINBETT_GRENZE = 8 * 1024 * 1024

export const BOARD_FORMAT_RATIO: Record<BoardFormat, number> = {
  '16:9': 16 / 9,
  '2.39:1': 2.39,
  '2:1': 2,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
}

/** Angereicherte Show-Details fürs Übersichts-Dashboard. */
export interface ShowDetails {
  dateLabel: string
  phase: ShowPhase
  /** Planungsfortschritt 0..1. */
  progress: number
  schedule: ScheduleItem[]
  /**
   * BEDARF 8 — der Ablauf des KUNDEN, eingelesen und mit dem Plan verknuepft.
   *
   * Er steht NEBEN `schedule` und nicht statt seiner, weil es zwei Dokumente
   * mit zwei Eigentuemern sind: `schedule` ist der Tagesablauf der Produktion
   * (Load-in, Soundcheck, Doors — hier angelegt, hier geaendert), dieser hier
   * die Programm-Reihenfolge, die in der Tabelle des Kunden lebt. Nach E-18
   * (2026-09-07) wird sie nur GELESEN; es gibt keinen Schreibweg hinein.
   * Optional — ein Projekt ohne eingelesenen Ablauf hat keinen.
   */
  rundown?: import('@avplan/ui').Rundown
  crew: CrewMember[]
  budget: BudgetLine[]
  logistics: LogisticsInfo
  contacts: Contact[]
  tasks: ProjectTask[]
  /** Kreativ-Board (Moodboard/Notizen) — die Vor-Produktionsebene der Show. */
  board: Board
  /** Belegkopf-Voreinstellungen fürs Fakturieren (optional; Default via healBilling). */
  billing?: BillingSettings
  /** Beleg-Historie: ausgestellte Angebote/Rechnungen dieses Projekts. */
  invoices?: InvoiceRecord[]
}

/** Ein ausgestellter Beleg (Angebot/Rechnung) in der Projekt-Historie. */
export interface InvoiceRecord {
  id: string
  kind: 'quotation' | 'invoice'
  /** ISO-Datum der Ausstellung (YYYY-MM-DD). */
  date: string
  recipientName: string
  net: number
  gross: number
  /** Lexware-Beleg-ID + Web-Link (falls an Lexware gesendet). */
  lexwareId?: string
  webUrl?: string
}

/**
 * EIN Geraet im Suite-Projekt — nicht eines je Planer (ADR-011, Stufe 2).
 *
 * ─── WAS HIER VERSCHWUNDEN IST, UND WARUM DAS DER PUNKT IST ────────────────
 *
 * Bis 2026-09-19 standen an dieser Stelle DREI Typen: `Camera`, `Fixture`,
 * `SignalNode`. Die Kamera `cam2` und ihr Knoten `n_cam2` waren zwei
 * Datensaetze fuer dasselbe Blech, verbunden nur durch eine erklaerte
 * Zuordnung (`SignalNode.represents`) — und die hatte im ganzen Baum ausser
 * in den Demo-Daten nie jemand gesetzt.
 *
 * Mit einer Liste gibt es nichts mehr zu verbinden. `represents` ist deshalb
 * WEG, nicht deaktiviert: ein Feld, das auf ein Objekt zeigt, das es nicht
 * mehr gibt, waere schlimmer als keins. Dasselbe gilt fuer `altIds` im Seed
 * und fuer die Sonderregel auf dem Rueckweg, die verhinderte, dass eine
 * Kamera als Knoten zurueckkam. Alle drei waren Geruest, und Geruest faellt,
 * wenn der Bau steht.
 *
 * ─── DIE FELDGRUPPEN SIND DIE EINHEIT DES EIGENTUMS ────────────────────────
 *
 * Gemeinsam oben, fachlich in `kamera` und `licht`. „Der Kameraplan darf
 * `kamera` schreiben" ist eine Regel, die man pruefen kann; eine Feldliste
 * veraltet beim naechsten Feld, ohne dass es jemand merkt.
 */
export interface SuiteGeraet {
  id: string
  name: string
  /**
   * Die Kategorie, wie der Katalog sie fuehrt („Cameras", „Licht", „Video
   * Mixer"). Sie ordnet das Geraet den Plaenen zu — MEHREREN zugleich: eine
   * Kamera steht im Kameraplan UND im Signalplan.
   *
   * Fehlt sie, gilt die Vorgabe `['signal']`: ein Geraet ohne Zuordnung ist
   * trotzdem ein Geraet im Plan. „Nicht angegeben" ist nicht „nirgends".
   */
  kategorie?: string
  /** Das Katalog-MODELL („Sony FX9"), nicht der Instanzname („Kamera 1"). */
  model?: string
  /**
   * Die Katalog-Identitaet des Modells (ADR-012, `@avplan/device-catalog`).
   *
   * Sie ist die Basis, die alle Planer teilen: der Kameraplan, der Lichtplan
   * und das Lager holen sich ueber sie IHREN Eintrag, statt `model` gegen die
   * eigene Liste zu vergleichen. Fehlt sie, stammt das Geraet aus keinem
   * Katalog — dann bleibt `model` die einzige Angabe.
   */
  typId?: string
  /**
   * Die Fachdaten je Gewerk — unveraendert mitgefuehrt (ADR-013).
   *
   * Die Shell LIEST hier nichts. Sie traegt, was die Planer an ihren eigenen
   * Faechern schreiben, damit ein Projekt von einem Planer zum naechsten und
   * wieder zurueck laufen kann, ohne dass die Arbeit dazwischen verschwindet.
   * Ohne diese Zeile faellt das Feld beim Speichern aus dem Typ — und dann
   * genau bei dem Weg heraus, fuer den es gebaut ist.
   */
  fachdaten?: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  /** Zweite Zeile am Knoten im Signalfluss („3x SDI Out"). Beschreibung. */
  sub?: string
  /** Shell-Begriff: steht es bodennah oder in der Regie? */
  group: 'floor' | 'regie'
  /** Shell-Begriff: steht es im Raum? */
  venue: boolean
  /** Lage im Signalfluss-Diagramm (0..1 relativ zur Flaeche). */
  nx?: number
  ny?: number
  /**
   * Lage im RAUM (Meter). Geteilt: Kameraplan, Lichtplan und Stueckliste
   * meinen dieselbe Stelle.
   *
   * Fehlt sie, ist das Geraet noch nicht platziert — nicht „am Nullpunkt".
   * Bis 2026-09-19 setzte der Rueckweg hier `0` ein, also die Ecke der Halle,
   * und die Vorschau zeichnete sie als Tatsache.
   */
  x?: number
  y?: number
  /** Was der KAMERAPLAN fuehrt. */
  kamera?: {
    lens?: string
    focalMm?: number
    hfovDeg?: number
    /** Im Kameraplan verkabelt. */
    linked?: boolean
  }
  /** Was der LICHTPLAN fuehrt. */
  licht?: {
    purpose?: string
    dimmerPct?: number
    dmxChannel?: number
    universe?: number
    /**
     * Haenge-Hoehe ueber dem Boden in Metern — vom Licht-Planer gemeldet.
     * Fehlt sie, hat sie niemand gesetzt. Eine Vorgabe waere eine Hoehe, die
     * niemand geplant hat, und sie liefe ueber den Seed in den Planer
     * zurueck; die Stueckliste rechnete daraufhin die Kabel zu kurz.
     */
    rigHeightM?: number
  }
}

export type CableLayer = 'video' | 'dmx' | 'net'

/**
 * ─── `SignalNode`, `Camera` und `Fixture` GIBT ES NICHT MEHR ───────────────
 *
 * Sie sind am 2026-09-19 in `SuiteGeraet` aufgegangen (ADR-011, Stufe 2).
 * Wer hier nach ihnen sucht: die Migration alter Projektdateien steht in
 * `projectFile.ts` und legt die drei Listen ueber die damals erklaerte
 * Zuordnung (`represents`) zusammen — das Feld ueberlebt also genau so
 * lange, wie es gebraucht wird, und keinen Tag laenger.
 */

export interface Cable {
  id: string
  label: string
  type: string
  layer: CableLayer
  lengthM: number
  from: string
  to: string
}

export interface SuiteProject {
  meta: ProjectMeta
  /**
   * DIE Geraeteliste — eine, nicht drei (ADR-011, Stufe 2).
   *
   * Welcher Plan ein Geraet zeigt, sagt seine Kategorie (`gewerkeFuer` in
   * `@avplan/ui`), und mehrere zugleich duerfen es sein. Die Helfer
   * `kameraGeraete`, `lichtGeraete` und `signalGeraete` weiter unten sind
   * die einzigen Stellen, die filtern — damit die Regel an EINER Stelle
   * steht und nicht in jeder Sicht neu.
   */
  geraete: SuiteGeraet[]
  cables: Cable[]
  /** Bühnenmaße (Meter) für die Plan-Vorschau. */
  stage: { x: number; y: number; w: number; h: number }
  hall: { w: number; h: number }
  show: ShowDetails
  /** Kleiner Lager-Ausschnitt (via @avplan/inventory-core) für den Pack-Status. */
  inventory: { items: InventoryItem[]; nodes: StorageNode[] }
  /**
   * Wer welches geteilte Seed-Feld hält (E-21). Nur der Raum ist heute
   * geteilt: MultiCam und Licht vermessen ihn beide, und wer ihn zuerst setzt,
   * hält ihn. Fehlt der Eintrag, hält ihn niemand — der nächste Schreiber
   * bekommt ihn.
   */
  seedHolds?: Partial<Record<import('@avplan/ui/embed').SeedSharedField, import('@avplan/ui/embed').SeedHold>>
  /**
   * Widersprüche, die NICHT überschrieben wurden — ein Planer hat ein Feld
   * anders gesetzt als der, der es hält. Sie stehen im Projekt und nicht in
   * einem Toast, weil ein Befund, der nach drei Sekunden verschwindet, dem
   * stillen Überschreiben zu ähnlich sieht: beide Male ist der Widerspruch
   * weg, bevor jemand ihn gelesen hat.
   */
  seedConflicts?: SeedConflictRecord[]
  /** Angebotene Uebergaben an die anderen Planer (Nutzer-Auftrag 2026-09-12). */
  seedHandoffs?: SeedHandoffRecord[]
  /**
   * Knoten-Ids, deren Kamera-Uebergabe der Nutzer ABGELEHNT hat.
   *
   * Ohne diese Liste kaeme derselbe Vorschlag nach jeder Meldung des
   * Signal-Planers wieder — und ein Streifen, der nach dem dritten „nein"
   * unveraendert dasteht, wird weggeklickt statt gelesen. Die Ablehnung ist
   * eine Aussage und wird deshalb gefuehrt, nicht vergessen.
   *
   * Sie haelt am KNOTEN und nicht am Namen: wer das Geraet umbenennt, hat es
   * nicht neu entschieden.
   */
  kameraUebergabeAbgelehnt?: string[]
  /**
   * Was der Bestand vom Bedarf des Plans deckt — gemeldet vom Lager-Modul.
   *
   * Sie wird GEFUEHRT und nicht abgeleitet: der Bedarf faellt aus dem Plan,
   * die Deckung ist die Antwort einer anderen App darauf. Fehlt das Feld, hat
   * niemand nachgesehen — das ist nicht dasselbe wie „nichts vorhanden", und
   * `SeedDeckung.gedeckt` haelt denselben Unterschied noch je Zeile fest.
   */
  deckung?: import('@avplan/ui/embed').SeedDeckung[]
  /**
   * Die Anschlusspunkte des Hauses — gemeldet vom Gebaeude-Modul.
   *
   * Sie stehen im Projekt und nicht im Gebaeude-Werkzeug allein, weil der Plan
   * an ihnen haengt: bis 2026-09-18 tippte sie jemand aus dem Gebaeudeplan in
   * die Stromplanung der Show ab. Leer heisst „keine gemeldet" und nicht „das
   * Haus hat keine".
   */
  anschluesse?: import('@avplan/ui/embed').SeedAnschluss[]
}

/**
 * Ein gemeldeter Widerspruch, wie das Projekt ihn führt. Der `id` macht ihn
 * für die Anzeige adressierbar (annehmen / verwerfen); `seenAt` ist der
 * Zeitpunkt, zu dem die Shell ihn aufgenommen hat.
 */
export interface SeedConflictRecord {
  id: string
  seenAt: number
  conflict: import('@avplan/ui/embed').SeedConflict
}

/**
 * Eine ANGEBOTENE Uebergabe: ein Planer hat gemeldet, die Shell hat es
 * eingearbeitet — und die Frage ist, ob die anderen Planer es bekommen.
 *
 * ─── WARUM DAS EIN KLICK IST UND KEIN AUTOMATISMUS ─────────────────────
 *
 * NUTZER-AUFTRAG vom 2026-09-12: „wenn man also im multicam planner eine
 * kamera hinzufuegt soll man anklicken koennen das die auch im cable planner
 * hinzugefuegt werden soll oder geaendert werden soll. und vice versa."
 *
 * Das ist nicht nur Geschmack. Eine Kamera im MultiCam-Planer ist eine
 * Position im Raum; im Cable-Planner ist sie ein Geraet mit Ports, das in
 * die Stueckliste eingeht und auf dem Kommissionierzettel landet. Wer im
 * MultiCam eine Kamera versuchsweise dazustellt, um eine Sichtlinie zu
 * pruefen, will sie nicht damit bestellt haben.
 *
 * Umgekehrt gilt dasselbe: automatisch stumm zu uebernehmen waere „letzter
 * gewinnt" — genau die Regel, gegen die in dieser Suite schon der
 * Konflikt-Streifen steht.
 */
export interface SeedHandoffRecord {
  id: string
  seenAt: number
  /** Welcher Planer gemeldet hat. */
  domain: import('@avplan/ui/embed').SeedDomain
  /** Was sich dadurch am Shell-Projekt geaendert hat, zum Nachlesen. */
  zusammenfassung: { neu: number; geaendert: number; entfernt: number }
}

export const PROJECT: SuiteProject = {
  meta: { name: 'Sommershow 2026', venue: 'Halle A', version: 12, saved: true },
  hall: { w: 24, h: 14 },
  stage: { x: 8, y: 3, w: 8, h: 3.2 },
  // EINE Liste (ADR-011, Stufe 2). Was frueher `cam1` UND `n_cam1` war, ist
  // jetzt ein Geraet: die Kamera-Felder in `kamera`, die Signal-Felder oben.
  // Die drei Kameras ohne eigenen Knoten im Signalweg behalten ihre Lage im
  // Raum und haben schlicht kein `nx`/`ny` — sie stehen im Kameraplan und im
  // Signalplan, nur hat sie dort noch niemand platziert.
  geraete: [
    { id: 'cam1', name: 'CAM 1 — Sony FX9', sub: '3× SDI Out', kategorie: 'Cameras', model: 'Sony FX9',
      group: 'floor', venue: true, nx: 0.08, ny: 0.12, x: 4.2, y: 10.8,
      kamera: { lens: 'FE 24–105 f/4', focalMm: 24, hfovDeg: 73.7, linked: true } },
    { id: 'cam2', name: 'CAM 2 — Sony FX9', sub: '3× SDI Out', kategorie: 'Cameras', model: 'Sony FX9',
      group: 'floor', venue: true, nx: 0.08, ny: 0.42, x: 12.0, y: 11.6,
      kamera: { lens: 'FE 24–105 f/4', focalMm: 85, hfovDeg: 12.4, linked: true } },
    { id: 'cam3', name: 'CAM 3', kategorie: 'Cameras', model: 'Sony VENICE 2',
      group: 'floor', venue: true, x: 20.4, y: 10.6,
      kamera: { lens: 'FE 70–200 f/2.8', focalMm: 135, hfovDeg: 7.9, linked: true } },
    { id: 'cam4', name: 'CAM 4', kategorie: 'Cameras', model: 'Sony FR7 PTZ',
      group: 'floor', venue: true, x: 3.4, y: 4.6,
      kamera: { lens: 'FE 24–105 f/4', focalMm: 35, hfovDeg: 54.4, linked: false } },

    { id: 'lx1', name: 'LX 1', kategorie: 'Licht', model: 'ETC Source Four 19°', group: 'floor', venue: true,
      x: 8.6, y: 5.6, licht: { purpose: 'Key Host', dimmerPct: 82, dmxChannel: 1 } },
    { id: 'lx2', name: 'LX 2', kategorie: 'Licht', model: 'ETC Source Four 36°', group: 'floor', venue: true,
      x: 10.0, y: 5.6, licht: { purpose: 'Fill', dimmerPct: 64, dmxChannel: 4 } },
    { id: 'lx3', name: 'LX 3', kategorie: 'Licht', model: 'ETC Source Four 26°', group: 'floor', venue: true,
      x: 11.2, y: 5.6, licht: { purpose: 'Key Host', dimmerPct: 78, dmxChannel: 7 } },
    { id: 'lx4', name: 'LX 4', kategorie: 'Licht', model: 'KL Fresnel 8 FC', group: 'floor', venue: true,
      x: 12.6, y: 5.6, licht: { purpose: 'Wash', dimmerPct: 55, dmxChannel: 10 } },
    { id: 'lx5', name: 'LX 5', kategorie: 'Licht', model: 'KL Panel XL', group: 'floor', venue: true,
      x: 14.0, y: 5.6, licht: { purpose: 'Backlight', dimmerPct: 70, dmxChannel: 13 } },
    { id: 'lx6', name: 'LX 6', kategorie: 'Licht', model: 'PAR 64 CP62', group: 'floor', venue: true,
      x: 15.4, y: 5.6, licht: { purpose: 'Effekt', dimmerPct: 40, dmxChannel: 16 } },

    { id: 'n_dimmer', name: 'Dimmer Rack 2', sub: '12 Kanäle · 16 A', group: 'floor', venue: true, nx: 0.08, ny: 0.72 },
    { id: 'n_atem', name: 'ATEM Constellation 8K', sub: '40× 12G-SDI In', kategorie: 'Video Mixer', group: 'regie', venue: false, nx: 0.62, ny: 0.14 },
    { id: 'n_hub', name: 'Videohub 40×40', sub: '12G-SDI Router', kategorie: 'Video Router', group: 'regie', venue: false, nx: 0.62, ny: 0.46 },
    { id: 'n_foh', name: 'FOH — GrandMA', sub: 'Licht-Pult', group: 'regie', venue: false, nx: 0.5, ny: 0.82 },
  ],
  cables: [
    { id: 'v012', label: 'V-012 · CAM2 PGM', type: '12G-SDI', layer: 'video', lengthM: 45, from: 'cam2', to: 'n_atem' },
    { id: 'v008', label: 'V-008 · CAM1 PGM', type: '12G-SDI', layer: 'video', lengthM: 45, from: 'cam1', to: 'n_atem' },
    { id: 'v021', label: 'V-021 · MV Out', type: '6G-SDI', layer: 'video', lengthM: 60, from: 'n_atem', to: 'n_hub' },
    { id: 'net04', label: 'N-004 · Cam-Ctrl', type: 'Cat6A', layer: 'net', lengthM: 45, from: 'cam1', to: 'n_hub' },
    { id: 'dmx03', label: 'D-003 · Dimmer A', type: 'DMX512', layer: 'dmx', lengthM: 25, from: 'n_dimmer', to: 'n_foh' },
  ],
  show: {
    dateLabel: 'Sa 18. Juli 2026',
    phase: 'setup',
    progress: 0.72,
    schedule: [
      { time: '08:00', title: 'Get-in / Anlieferung', dept: 'all' },
      { time: '09:00', title: 'Rigging & Truss', dept: 'light' },
      { time: '10:30', title: 'Strom & DMX-Patch', dept: 'light' },
      { time: '11:00', title: 'SDI-Verkabelung', dept: 'video' },
      { time: '13:00', title: 'Kamera-Check & Whitebalance', dept: 'video' },
      { time: '14:30', title: 'Soundcheck', dept: 'audio' },
      { time: '16:00', title: 'Doors', dept: 'prod' },
      { time: '17:00', title: 'Show', dept: 'prod' },
      { time: '19:30', title: 'Load-out', dept: 'all' },
    ],
    crew: [
      { name: 'Lars Zumpe', role: 'Projektleitung', dept: 'prod', call: '08:00', status: 'confirmed' },
      { name: 'M. Berg', role: 'Video-Engineer', dept: 'video', call: '08:00', status: 'confirmed' },
      { name: 'S. Klein', role: 'Kameramann', dept: 'video', call: '12:00', status: 'confirmed' },
      { name: 'T. Wolf', role: 'Lichttechnik', dept: 'light', call: '09:00', status: 'confirmed' },
      { name: 'A. Roth', role: 'FOH / Ton', dept: 'audio', call: '10:00', status: 'pending' },
      { name: 'J. Frei', role: 'Rigging', dept: 'light', call: '08:00', status: 'confirmed' },
    ],
    budget: [
      { category: 'Video', estimatedEur: 8400, actualEur: 8120 },
      { category: 'Licht', estimatedEur: 5200, actualEur: 5460 },
      { category: 'Ton', estimatedEur: 3100, actualEur: 2980 },
      { category: 'Rigging', estimatedEur: 1800, actualEur: 1800 },
      { category: 'Transport', estimatedEur: 1200, actualEur: 1340 },
      { category: 'Crew', estimatedEur: 6400, actualEur: 6100 },
    ],
    logistics: {
      vehicles: [
        { label: '7,5 t LKW', detail: 'Video + Rigging' },
        { label: 'Sprinter', detail: 'Licht + Kabel' },
      ],
      loadIn: '08:00',
      distanceKm: 42,
    },
    contacts: [
      { name: 'H. Vogt', role: 'Haustechnik', org: 'Halle A', phone: '+49 30 1234-56' },
      {
        name: 'Nordlicht Events GmbH',
        role: 'Auftraggeber',
        org: 'Produktion',
        phone: '+49 40 9876-10',
        billTo: true,
        email: 'buchhaltung@nordlicht-events.de',
        street: 'Hafenstraße 12',
        zip: '20359',
        city: 'Hamburg',
        countryCode: 'DE',
        vatId: 'DE123456789',
        customerNumber: 'K-1042',
      },
    ],
    billing: {
      taxType: 'net',
      taxRatePercent: 19,
      rentalDays: 2,
      paymentTermDays: 14,
      quoteValidDays: 14,
      introduction: 'Vielen Dank für Ihre Anfrage — nachfolgend unser Angebot für die Produktion.',
      remark: 'Alle Preise verstehen sich zzgl. gesetzlicher MwSt.',
    },
    tasks: [
      { title: 'CAM 4 verkabeln', done: false, due: 'Do', owner: 'M. Berg' },
      { title: 'Patch-Sheet finalisieren', done: false, due: 'Fr', owner: 'T. Wolf' },
      { title: 'Rentman-Kabelmengen zurücksynchen', done: false, owner: 'Lars Z.' },
      { title: 'Rigging-Plan freigegeben', done: true },
    ],
    board: {
      cards: [
        { id: 'b_h', type: 'heading', x: 60, y: 40, w: 320, text: 'Look & Feel — Sommershow' },
        { id: 'b_l1', type: 'look', x: 60, y: 120, w: 190, title: 'Warmes Bühnenlicht', color: '#f5a623' },
        { id: 'b_l2', type: 'look', x: 270, y: 120, w: 190, title: 'Kühle Akzente', color: '#38bdf8' },
        { id: 'b_l3', type: 'look', x: 480, y: 120, w: 190, title: 'Publikum im Dunkel', color: '#1a2130' },
        { id: 'b_n1', type: 'note', x: 60, y: 300, w: 230, text: 'Host in Key/Fill 2,8 : 1 halten — warmer Vordergrund, kühles Backlight. Abgleich mit Licht-Modul.' },
        { id: 'b_c1', type: 'color', x: 320, y: 300, w: 110, title: 'L204 · CTB', color: '#f2c26b' },
        { id: 'b_c2', type: 'color', x: 440, y: 300, w: 110, title: 'R132 · Blau', color: '#5aa9e6' },
        { id: 'b_t1', type: 'todo', x: 60, y: 430, w: 260, title: 'Kreativ-Freigaben', items: [
          { text: 'Bühnenbild abgenommen', done: true },
          { text: 'Kamerapositionen final', done: false },
          { text: 'Licht-Stimmung Doors', done: false },
        ] },
        { id: 'b_lk1', type: 'link', x: 480, y: 300, w: 220, title: 'Referenz-Show 2025', url: 'vimeo.com/nordlicht/sommer25' },
        {
          id: 'b_sub', type: 'board', x: 480, y: 430, w: 210, title: 'Kamera-Refs',
          board: {
            cards: [
              { id: 's_h', type: 'heading', x: 60, y: 40, w: 320, text: 'Kamera-Referenzen' },
              { id: 's_l1', type: 'look', x: 60, y: 120, w: 190, title: 'Weitwinkel-Opener', color: '#38bdf8' },
              { id: 's_l2', type: 'look', x: 270, y: 120, w: 190, title: 'Tele auf Host', color: '#a78bfa' },
              { id: 's_n1', type: 'note', x: 60, y: 300, w: 240, text: 'CAM 3 als Beauty-Shot mit 135 mm, weiche Schärfe.' },
            ],
            connections: [],
          },
        },
      ],
      connections: [
        { id: 'bc1', from: 'b_h', to: 'b_l1' },
        { id: 'bc2', from: 'b_n1', to: 'b_c1' },
        { id: 'bc3', from: 'b_n1', to: 'b_c2' },
      ],
    },
  },
  inventory: {
    nodes: [
      { id: 'case1', name: 'Case 1 — Funkstrecken', kind: 'case', createdAt: 't', updatedAt: 't' },
      { id: 'case2', name: 'Case 2 — SDI-Kabel', kind: 'case', createdAt: 't', updatedAt: 't' },
      { id: 'shelfA', name: 'Regal A3', kind: 'shelf', createdAt: 't', updatedAt: 't' },
    ],
    items: [
      { id: 'i1', model: 'Shure ULXD2', quantity: 4, locationId: 'case1', createdAt: 't', updatedAt: 't' },
      { id: 'i2', model: '12G-SDI 50 m', quantity: 8, locationId: 'case2', createdAt: 't', updatedAt: 't' },
      { id: 'i3', model: 'ETC Source Four 26°', quantity: 6, locationId: 'case2', createdAt: 't', updatedAt: 't' },
      { id: 'i4', model: 'KL Panel XL', quantity: 2, locationId: 'shelfA', createdAt: 't', updatedAt: 't' },
      { id: 'i5', model: 'Stativ-Set', quantity: 3, createdAt: 't', updatedAt: 't' },
    ],
  },
}

export interface ProjectCounts {
  cameras: number
  fixtures: number
  cables: number
  devices: number
}

export function computeCounts(p: SuiteProject): ProjectCounts {
  // Die Zahlen sind SICHTEN auf eine Liste und addieren sich deshalb nicht
  // zur Gesamtzahl: eine Kamera zaehlt bei `cameras` UND bei `devices`, weil
  // sie in beiden Plaenen steht. Das ist die Aussage und kein Rechenfehler —
  // vorher waren es drei Listen, und die Summe war eine Zufallszahl aus der
  // Frage, wer wen doppelt fuehrte.
  return {
    cameras: kameraGeraete(p).length,
    fixtures: lichtGeraete(p).length,
    cables: p.cables.length,
    devices: signalGeraete(p).length,
  }
}

export const LAYER_COLOR: Record<CableLayer, string> = {
  video: 'var(--av-ok)',
  dmx: 'var(--av-danger)',
  net: 'var(--mod-cameras)',
}

export const LAYER_LABEL: Record<CableLayer, string> = {
  video: 'Video',
  dmx: 'DMX',
  net: 'Netz',
}

export const DEPARTMENT_COLOR: Record<Department, string> = {
  video: 'var(--mod-cameras)',
  light: 'var(--mod-licht)',
  audio: 'var(--mod-signal)',
  prod: 'var(--mod-raum)',
}

export const DEPARTMENT_LABEL: Record<Department, string> = {
  video: 'Video',
  light: 'Licht',
  audio: 'Ton',
  prod: 'Produktion',
}

export const PHASE_LABEL: Record<ShowPhase, string> = {
  planning: 'Planung',
  setup: 'Aufbau',
  show: 'Show',
  teardown: 'Abbau',
}

/** Budget-Summen über alle Kategorien. */
export function budgetTotals(lines: BudgetLine[]): { estimated: number; actual: number } {
  return lines.reduce(
    (acc, l) => ({ estimated: acc.estimated + l.estimatedEur, actual: acc.actual + l.actualEur }),
    { estimated: 0, actual: 0 },
  )
}

export interface Readiness {
  totalQty: number
  packedQty: number
  openQty: number
  packedPct: number
  cases: number
}

/**
 * Pack-Bereitschaft aus dem Lager-Ausschnitt — nutzt das geteilte
 * @avplan/inventory-core-Modell (LPN-Prinzip: ein Artikel gilt als gepackt,
 * wenn sein Lagerort ein Container/Case ist). Zeigt, wie das Datenpaket über
 * die Planer hinaus auch die Shell speist.
 */
export function computeReadiness(inv: { items: InventoryItem[]; nodes: StorageNode[] }): Readiness {
  const containerIds = new Set(
    inv.nodes.filter((n) => CONTAINER_KINDS.includes(n.kind)).map((n) => n.id),
  )
  let totalQty = 0
  let packedQty = 0
  for (const it of inv.items) {
    totalQty += it.quantity
    if (it.locationId && containerIds.has(it.locationId)) packedQty += it.quantity
  }
  const openQty = totalQty - packedQty
  return {
    totalQty,
    packedQty,
    openQty,
    packedPct: totalQty === 0 ? 0 : Math.round((packedQty / totalQty) * 100),
    cases: containerIds.size,
  }
}

/** Belegkopf-Defaults, wenn ein (geladenes) Projekt noch keine hat. */
export const DEFAULT_BILLING: BillingSettings = {
  taxType: 'net',
  taxRatePercent: 19,
  rentalDays: 1,
  paymentTermDays: 14,
  quoteValidDays: 14,
}

/** Belegkopf des Projekts mit Defaults auffüllen (Schema-Migration). */
export function resolveBilling(show: ShowDetails): BillingSettings {
  return { ...DEFAULT_BILLING, ...(show.billing ?? {}) }
}

/** Ersten als Rechnungsempfänger markierten Kontakt liefern (sonst undefined). */
export function billToContact(show: ShowDetails): Contact | undefined {
  return show.contacts.find((c) => c.billTo)
}

/** Verfügbare Projekte für den Projekt-Wechsler (Erweiterungspunkt). */
export const PROJECTS: SuiteProject[] = [PROJECT]

/** Leeres Board für den Standalone-Betrieb (ohne zugewiesenes Projekt). */
export const emptyBoard = (): Board => ({ cards: [], connections: [] })


// ───────────────────────────────────────────────────────────────────────────
// DIE SICHTEN AUF DIE EINE LISTE
//
// Kein Filter steht woanders. Waere er in jeder Sicht wiederholt, hiesse das:
// die Regel „welches Geraet gehoert in welchen Plan" stuende fuenfmal da, und
// beim naechsten Sonderfall vier davon falsch.
// ───────────────────────────────────────────────────────────────────────────

/** Die Geraete, die der Kameraplan zeigt. */
export const kameraGeraete = (p: SuiteProject): SuiteGeraet[] =>
  p.geraete.filter((g) => imPlan(g, 'kamera'))

/** Die Geraete, die der Lichtplan zeigt. */
export const lichtGeraete = (p: SuiteProject): SuiteGeraet[] =>
  p.geraete.filter((g) => imPlan(g, 'licht'))

/**
 * Die Geraete, die der Signalplan zeigt — also alle, die Anschluesse haben.
 *
 * Das ist praktisch die ganze Liste, und das ist richtig: eine Kamera haengt
 * an einem Kabel, eine Leuchte auch. Gefiltert wird trotzdem ueber dieselbe
 * Tabelle wie oben, damit eine kuenftige Kategorie ohne Signalbezug hier von
 * selbst herausfaellt.
 */
export const signalGeraete = (p: SuiteProject): SuiteGeraet[] =>
  p.geraete.filter((g) => imPlan(g, 'signal'))

/** Ein Geraet zu seiner Id — oder `undefined`. */
export const geraetMit = (p: SuiteProject, id: string | undefined): SuiteGeraet | undefined =>
  id ? p.geraete.find((g) => g.id === id) : undefined

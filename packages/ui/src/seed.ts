// ───────────────────────────────────────────────────────────────────────────
// `suite-seed` v3 — das neutrale Projektmodell, das die Shell in die
// eingebetteten Planer schiebt und aus ihnen zurueckbekommt.
//
// WARUM ES DAS BRAUCHT. Bis hierher war die Einbettung eine reine
// Anzeige-Beziehung: `PlannerFrame` reichte eine URL und ein Theme hinein, die
// Brueckendatei der Shell (`embed/plannerBridge.ts`) trug genau zwei Befehle,
// `undo` und `redo`. Wer die gebaute Suite oeffnete und auf „Signal" klickte,
// sah links die Geraete des Shell-Projekts und in der Mitte einen leeren
// Cable-Planer mit seinem Erst-Start-Dialog. Beide Haelften waren fuer sich
// richtig und wussten nichts voneinander (Backlog B-20).
//
// WARUM NEUTRAL UND NICHT `.avplan`. Es gibt bereits ein gemeinsames
// Gesamtformat: `.avplan` (`venue` + die Domaenen-Slots `cameras`, `lighting`,
// `cabling`). Dessen Slots tragen aber jeweils das NATIVE Projekt der
// jeweiligen App — der `cabling`-Slot ist ein vollstaendiges
// `CablePlannerProject`. Damit die Shell eine `.avplan` erzeugen koennte,
// muesste sie die drei nativen Datenmodelle kennen und nachbauen; jede
// Modell-Aenderung in einem Planer wuerde die Shell brechen.
//
// Dieses Format geht den anderen Weg: es beschreibt nur das, was die Shell
// ohnehin fuehrt (Raum, Kameras, Leuchten, Signalknoten, Kabel), und die
// Abbildung auf das native Modell macht jeder Planer selbst — dort, wo sein
// Modell und sein Geraete-Katalog liegen. Das ist dieselbe Arbeitsteilung, die
// `multicamCameraImport.ts` im Cable-Planer schon fuer die `camera-list`
// benutzt: die importierende App besitzt die Abbildung.
//
// WAS ES BEWUSST NICHT KANN. Es ist kein Austauschformat fuer Dateien und
// tritt nicht neben `.avplan`. Es faehrt ueber den postMessage-Bus zwischen
// Shell und iframe und traegt nur Felder, fuer die die Shell eine Quelle hat.
// Alles, was ein Planer daraus baut, ist damit ausdruecklich ein SEED und
// keine Datenblatt-Wahrheit — die Planer markieren das entsprechend
// (`portsUnknown` im Cable-Planer), statt Ports zu erfinden.
// ───────────────────────────────────────────────────────────────────────────

import type { SeedGeraet } from './geraet'

export const SUITE_SEED_KIND = 'suite-seed' as const
/**
 * 2 seit 2026-09-18: `bedarf`, `deckung` und `anschluesse` sind hinzugekommen,
 * und alle drei sind PFLICHTFELDER (leere Liste heisst „nichts", nicht
 * „unbekannt"). Ein Planer, der gegen v1 gebaut ist, weist einen v2-Seed ab —
 * das ist gewollt: er wuerde das Lager sonst mit einem Seed befuellen, in dem
 * der Bedarf schlicht fehlt, und ein leeres Lager sieht aus wie ein gedeckter
 * Bedarf.
 *
 * Die Umstellung ist deshalb ungefaehrlich, weil der Seed NUR suite-intern
 * faehrt: Sender und Empfaenger liegen beide in diesem Repo (`apps/`), die
 * eigenstaendigen Planer-Repos kennen ihn nicht.
 */
export const SUITE_SEED_VERSION = 3 as const

/** Der geteilte Raum. Masse in Metern. */
export interface SeedVenue {
  name: string
  widthM?: number
  heightM?: number
  /** Buehnenflaeche in Metern, Ursprung links oben wie im Shell-Plan. */
  stage?: { x: number; y: number; w: number; h: number }
}

export interface SeedCamera {
  id: string
  name: string
  model?: string
  lens?: string
  focalMm?: number
  hfovDeg?: number
  /** Position im Raum (Meter). */
  x?: number
  y?: number
}

export interface SeedFixture {
  id: string
  name: string
  /**
   * Haenge-Hoehe ueber dem Boden in Metern, WENN sie jemand gesetzt hat.
   *
   * Optional und nie erfunden: eine fehlende Hoehe heisst „nicht angegeben"
   * und nicht „haengt am Boden". Wer hier eine Vorgabe eintraegt, macht aus
   * einer UI-Voreinstellung des Planers eine Aussage ueber diese Show — und
   * die naechste App liest sie als gesetzt.
   *
   * Sie gehoert in den Seed und nicht nur in den Licht-Planer: sie entscheidet
   * ueber die Kabellaenge zum Scheinwerfer, und die Stueckliste zieht sie aus
   * demselben Projekt.
   */
  rigHeightM?: number
  model?: string
  /** Freitext-Zweck („Key Host", „Fill", „Backlight"). */
  purpose?: string
  /** Dimmer-Stellung in Prozent (0..100). */
  dimmerPct?: number
  dmxChannel?: number
  universe?: number
  x?: number
  y?: number
}

/**
 * Ein Knoten im Signalfluss. Absichtlich ohne Ports: die Shell kennt keine
 * Port-Belegung, und eine erfundene waere eine plausible-aber-falsche Tatsache,
 * die still in Stueckliste und Patchliste eingeht. Der Cable-Planer loest den
 * Namen gegen seinen Katalog auf und markiert, was er nicht aufloesen konnte.
 */
export interface SeedDevice {
  id: string
  name: string
  /** Zweite Zeile am Knoten („3x SDI Out"). Beschreibung, keine Port-Angabe. */
  subtitle?: string
  model?: string
  /** Normalisierte Lage im Signalfluss-Diagramm (0..1), wie die Shell sie fuehrt. */
  nx?: number
  ny?: number
  /** Lage im Raum (Meter), falls das Geraet im Venue steht. */
  x?: number
  y?: number
  /**
   * Die Kategorie, wie der Katalog des fuehrenden Planers sie fuehrt
   * („Cameras", „Video Mixer", „Monitors").
   *
   * Sie ordnet das Geraet den PLAENEN zu (`gewerkeFuer` in `geraet.ts`) —
   * eine Kamera steht im Kameraplan und im Signalplan, ein Mischer nur im
   * Signalplan. Ohne sie koennte die Shell die Listen nicht zusammenfuehren:
   * `devices` und `cameras` waeren wieder zwei Datensaetze fuer dasselbe
   * Blech, die nur eine Namensaehnlichkeit verbindet.
   *
   * DEKLARIERT, NICHT GERATEN (ADR-002). Der fuehrende Planer setzt sie aus
   * seinem Katalog — beim Cable-Planer aus `deviceTypeId` ueber das
   * Datenblatt-Template. Aus dem Namen abgeleitet waere es dieselbe Falle wie
   * `seedFromEquipment` damals: „Kamera 1" ist ein Instanzname und keine
   * Typaussage.
   *
   * Fehlt sie, hat NIEMAND etwas gesagt. Das ist nicht „gehoert nirgends
   * hin": ein von Hand angelegtes Geraet ohne Katalog-Zuordnung faellt auf
   * die Vorgabe `['signal']` und steht damit im Plan, der seine Anschluesse
   * fuehrt.
   */
  kategorie?: string
}

export interface SeedCable {
  id: string
  label: string
  /** Kabeltyp als Klartext, wie ihn die Shell fuehrt („12G-SDI", „DMX512"). */
  type: string
  lengthM?: number
  /** Verweise auf `SeedDevice.id`. */
  from: string
  to: string
}

/**
 * Wer ein Feld schreiben darf. Die Shell ist eine Quelle wie ein Planer —
 * sie fuehrt den Raum-Namen und den Projektnamen selbst.
 */
export type SeedWriter = 'shell' | SeedDomain

/**
 * Wer ein geteiltes Feld gerade HAELT. `at` ist der Zeitpunkt der Setzung in
 * Epoch-Millisekunden, vom Schreiber gestempelt und nicht hier erzeugt: diese
 * Datei rechnet, sie liest keine Uhr (dieselbe Trennung wie beim
 * Ablauf-Import, `now()` wird hereingereicht).
 *
 * `at` entscheidet NICHT, wer gewinnt — es steht im Befund, damit jemand die
 * beiden Setzungen einordnen kann. „Letzter gewinnt mit Zeitstempel" ist
 * ausdruecklich die Regel, gegen die E-21 entschieden hat: sie macht aus einem
 * Widerspruch ein Rennen, dessen Ausgang von der Netzlaufzeit abhaengt.
 */
export interface SeedHold {
  by: SeedWriter
  at: number
}

/**
 * Die Felder, die mehr als eine App schreibt — und damit die einzigen, bei
 * denen ueberhaupt ein Widerspruch entstehen kann. Alles andere haengt an
 * genau einer Domaene und ist ueber `SeedPatch.domain` schon getrennt.
 *
 * Heute ist das der Raum: MultiCam vermisst ihn fuer die Sichtlinien, Licht
 * fuer die Rigging-Punkte. Beide duerfen ihn setzen, keiner still
 * ueberschreiben.
 */
export type SeedSharedField = 'venue.widthM' | 'venue.heightM' | 'venue.stage'

/**
 * Eine Bedarfszeile: ein Modell mit einer Menge.
 *
 * Die Felder sind absichtlich die Teilmenge von `BedarfsZeile` des
 * `inventory-planner`, die die Shell BELEGEN kann. Was dort darueber hinaus
 * steht (`muster`: Mietpreis, Lagerort, Lieferant), fuellt das Lager aus
 * seinen eigenen Stammdaten — die Shell kennt sie nicht und erfindet sie
 * nicht.
 */
export interface SeedBedarf {
  /** Stabiler Schluessel: Katalog-Id, sonst der normalisierte Modellname. */
  key: string
  /** Katalog-GUID, wenn der Plan sie kennt (ADR-002). */
  deviceTypeId?: string
  /** Modellname, sonst der Geraetename — siehe `modellUnbekannt`. */
  label: string
  category?: string
  quantity: number
  /** Aus welcher Domaene die Zeile stammt. */
  fromDomain: SeedDomain
  /**
   * WAHR, wenn der Plan zu diesem Geraet kein Modell fuehrt und `label` der
   * INSTANZNAME ist („Kamera 1").
   *
   * Der Unterschied ist der Kern von ADR-002. Der alte
   * `seedFromEquipment` schluesselte ueber den Instanznamen, und damit wurden
   * aus zwei Kameras desselben Typs zwei Lagerpositionen à 1 Stueck. Hier
   * werden solche Zeilen deshalb NICHT zusammengefasst — zwei Geraete ohne
   * Modell sind zwei unbekannte Geraete und nicht zwei Stueck desselben —
   * und sie tragen die Marke, damit das Lager sie als offenen Punkt zeigt
   * statt als Position anzulegen.
   */
  modellUnbekannt?: true
}

/**
 * Was der Bestand von einer Bedarfszeile deckt.
 *
 * `gedeckt` ist optional, und das ist die ganze Aussage: fehlt es, hat
 * NIEMAND GEZAEHLT. „0 vorhanden" waere eine Behauptung ueber etwas, das
 * nicht nachgesehen wurde — dieselbe Regel wie bei `CableStockEntry.count`
 * im Cable-Planer und bei `isForeign` im Lager.
 *
 * Was fehlt, steht bewusst nicht als Feld hier: es ist `benoetigt - gedeckt`
 * und damit eine Ableitung, die veralten koennte, sobald eine der beiden
 * Zahlen sich aendert.
 */
export interface SeedDeckung {
  key: string
  benoetigt: number
  gedeckt?: number
}

/**
 * Ein Anschlusspunkt des GEBAEUDES — Einspeisung oder Dose.
 *
 * Er steht im Seed, weil der Plan ihn braucht und nicht kennt: die Show haengt
 * an den Dosen des Hauses, und bis 2026-09-18 tippte sie jemand ab. Der Punkt
 * selbst bleibt beim Gebaeude (ADR-006) — hier faehrt nur, was der Plan
 * beantwortet haben will.
 *
 * `dauerleistungW` ist optional, und das ist keine Bequemlichkeit: der
 * Nennstrom der Absicherung ist die AUSLOESESCHWELLE und nicht die zulaessige
 * Dauerlast. Wer die Zahl aus `absicherungA × 230` rechnet, liefert eine
 * Vermutung, die im Plan wie eine Auskunft des Hauses aussieht — die Regel
 * steht in der CLAUDE.md des `facility-planner` unter „Die Tuer rechnet nicht
 * selbst".
 */
export interface SeedAnschluss {
  id: string
  bezeichnung: string
  art: 'einspeisung' | 'dose'
  /** Wie das HAUS den Raum fuehrt (Tuerschild, TIA-606) — nicht unsere Id. */
  raum?: string
  /** Steckerform als Klartext des Gebaeudes („CEE 63", „Schuko"). */
  anschlussart: string
  /** Nennstrom der Absicherung in Ampere. */
  absicherungA: number
  /** Zulaessige Dauerleistung, WENN das Haus sie angibt. */
  dauerleistungW?: number
  /**
   * Der Punkt haengt an einer Schaltstelle oder einem Dimmer.
   *
   * `undefined` heisst „nicht angegeben" und NICHT „nein". Eine Dose, von der
   * niemand weiss, ob sie geschaltet ist, ist keine ungeschaltete Dose — und
   * eine gedimmte Dose ist fuer ein Netzteil unbrauchbar.
   */
  geschaltet?: boolean
  gedimmt?: boolean
}

export interface SuiteSeed {
  kind: typeof SUITE_SEED_KIND
  formatVersion: typeof SUITE_SEED_VERSION
  /**
   * Zaehlt hoch, sobald sich der Inhalt in der Shell aendert. Der Planer
   * uebernimmt einen Seed nur, wenn dessen Revision neuer ist als die zuletzt
   * uebernommene — sonst wuerde jede Rueckmeldung, die die Shell erneut senden
   * laesst, die Arbeit im Planer ueberschreiben (Echo-Schleife).
   */
  revision: number
  /** Name des Projekts in der Shell — nur zur Anzeige im Planer. */
  projectName?: string
  venue: SeedVenue
  /**
   * DIE Geraeteliste — eine, nicht drei (Eigentuemer-Entscheidung 2026-09-19,
   * ADR-011).
   *
   * Hier steht jedes Geraet genau einmal, mit allen Feldern aller Planer und
   * seiner Kategorie. Die drei Listen darunter sind seit Formatversion 3
   * SICHTEN darauf (`alsKameras`, `alsLeuchten`, `alsSignalGeraete`) und
   * keine eigenen Wahrheiten mehr.
   */
  geraete: SeedGeraet[]
  /**
   * Sicht des Kameraplans auf `geraete`.
   *
   * ABGELEITET, nicht gefuehrt. Sie bleibt, bis der Kameraplan auf `geraete`
   * steht — ein Umbau, der alle drei Planer gleichzeitig austauscht, waere
   * ein Tag ohne lauffaehigen Stand.
   */
  cameras: SeedCamera[]
  /** Sicht des Lichtplans auf `geraete`. Abgeleitet, nicht gefuehrt. */
  fixtures: SeedFixture[]
  /** Sicht des Signalplans auf `geraete`. Abgeleitet, nicht gefuehrt. */
  devices: SeedDevice[]
  cables: SeedCable[]
  /**
   * Der Bedarf des Plans — was an Geraeten gebraucht wird, als Modell mit
   * Menge. ABGELEITET und nie gefuehrt: `suiteToSeed` rechnet ihn bei jedem
   * Senden aus `cameras`/`fixtures`/`devices` neu aus.
   *
   * Dass er trotzdem im Seed steht und nicht erst im Lager gerechnet wird,
   * ist ADR-006: „Der Plan rechnet seinen Bedarf selbst und reicht
   * `BedarfsZeile[]` herueber." Rechnete das Lager ihn, muesste es das
   * Plan-Modell kennen — genau die Grenze, gegen die der Wächter dort steht.
   *
   * Dass er nicht im `SuiteProject` liegt, ist ADR-001: eine gespeicherte
   * Ableitung ist eine zweite Wahrheit, die beim naechsten Geraet veraltet.
   */
  bedarf: SeedBedarf[]
  /**
   * Was der Bestand davon deckt — die Antwort des Lagers, weitergereicht an
   * alle anderen Planer.
   *
   * Sie steht hier, damit der Signal-Plan „3 von 4 vorhanden" zeigen kann,
   * ohne das Lager-Modell zu kennen. Das ist die Richtung, die bis 2026-09-18
   * fehlte: das Lager war ein Modul in der Leiste, aber keine Datenquelle.
   */
  deckung: SeedDeckung[]
  /**
   * Die Anschlusspunkte des Hauses, gemeldet vom Gebaeude-Werkzeug.
   *
   * Sie werden GEFUEHRT und nicht abgeleitet: sie sind die Auskunft einer
   * anderen App ueber die Anlage, nicht eine Rechnung ueber den Plan. Leer
   * heisst „keine gemeldet" — wer daraus „das Haus hat keine Dosen" liest,
   * liest eine Aussage, die niemand gemacht hat.
   */
  anschluesse: SeedAnschluss[]
  /**
   * Wer welches geteilte Feld haelt. Fehlt ein Eintrag, haelt es niemand — der
   * naechste Schreiber bekommt es. Optional, damit ein Seed aus der Zeit vor
   * E-21 weiter gilt: kein Halter heisst „noch nicht beansprucht" und nicht
   * „ungueltig".
   */
  holds?: Partial<Record<SeedSharedField, SeedHold>>
  /**
   * WOHER dieser Stand kommt: die Domaene des Planers, dessen Meldung ihn
   * ausgeloest hat. Fehlt das Feld, kommt er aus der Shell selbst
   * (Projektwechsel, Undo, Kopf-Aenderung).
   *
   * ─── WARUM ES DAS BRAUCHT ────────────────────────────────────────────
   *
   * Die Echo-Schleife (Shell schiebt → Planer meldet → Shell schiebt
   * erneut → Planer ueberschreibt seine eigene neuere Arbeit) war bis
   * 2026-09-12 ueber die REVISION abgeschnitten: die Shell zaehlte sie beim
   * Einarbeiten einer Meldung nicht hoch. Das schnitt das Echo ab — und mit
   * ihm die Weitergabe. NUTZER-MELDUNG vom selben Tag: „wenn man im av
   * planner den cable planner oeffnet stehen dort andere kameras als im
   * multicam planner."
   *
   * Genau so war es: eine in MultiCam angelegte Kamera kam bis ins
   * Shell-Projekt und blieb dort stehen. Der Cable-Planner bekam nie einen
   * Seed mit hoeherer Revision und zeigte weiter seinen eigenen Stand. Die
   * Schleife war zu, aber die Suite war keine Suite mehr — jede App haette
   * genauso gut allein laufen koennen.
   *
   * Mit der Herkunft geht beides: die Revision zaehlt hoch (alle ANDEREN
   * Planer bekommen den Stand), und der MELDER erkennt seinen eigenen Hall
   * und uebernimmt ihn nicht.
   */
  origin?: SeedDomain
}

/**
 * Welcher Planer welchen Teil besitzt. Ein Planer meldet ausschliesslich
 * seine eigene Domaene zurueck; alles andere reicht er unveraendert durch.
 */
export type SeedDomain = 'cameras' | 'fixtures' | 'signal' | 'lager' | 'gebaeude'

/**
 * Rueckweg: was ein Planer nach einer Aenderung ueber seinen Teil meldet.
 * `revision` ist die Revision des Seeds, auf dem die Aenderung aufsetzt — die
 * Shell verwirft eine Meldung, die auf einem ueberholten Seed beruht, statt
 * neueren Inhalt damit zu ueberschreiben.
 */
export interface SeedPatch {
  domain: SeedDomain
  revision: number
  /**
   * Zeitpunkt der Aenderung im Planer (Epoch-Millisekunden). Steht im Befund,
   * wenn zwei Apps dasselbe geteilte Feld verschieden setzen. Fehlt er, gilt
   * 0 — der Befund ist dann aermer, aber nicht falsch.
   */
  at?: number
  /**
   * Der Raum. Anders als die drei Domaenen-Listen gehoert er KEINEM Planer
   * allein (E-21): MultiCam und Licht vermessen beide, und bis 2026-09-08 ging
   * er nur hin und nie zurueck — wer die Halle im Planer korrigierte,
   * korrigierte sie nicht in der Shell (B-39, Punkt 1).
   *
   * Ein Planer darf ihn deshalb mit jeder Domaene mitschicken. Was damit
   * geschieht, entscheidet `mergeSeedPatch` nach Eigentum je Feld — nicht der
   * Empfaenger und nicht die Reihenfolge des Eintreffens.
   */
  venue?: SeedVenue
  cameras?: SeedCamera[]
  fixtures?: SeedFixture[]
  devices?: SeedDevice[]
  cables?: SeedCable[]
  /**
   * Die Meldung des Lagers: was der Bestand vom Bedarf deckt.
   *
   * Der Bedarf kommt NICHT zurueck — er ist eine Ableitung aus dem Plan, und
   * das Lager darf ihn nicht umschreiben. Wuerde es das, waere die Grenze aus
   * ADR-006 in der anderen Richtung durchbrochen: das Lager haette eine
   * Meinung darueber, was der Plan braucht.
   */
  deckung?: SeedDeckung[]
  /**
   * Die Meldung des Gebaeudes: welche Anschlusspunkte es gibt.
   *
   * Nur das Gebaeude darf sie setzen. Ein Planer, der sie mitschickte, haette
   * eine Meinung ueber die Hausinstallation — und genau die soll er nicht
   * haben, sondern nachlesen.
   */
  anschluesse?: SeedAnschluss[]
}

/** Leerer Seed — Ausgangspunkt fuer Tests und fuer „kein Projekt offen". */
export function emptySeed(revision = 0): SuiteSeed {
  return {
    kind: SUITE_SEED_KIND,
    formatVersion: SUITE_SEED_VERSION,
    revision,
    venue: { name: '' },
    geraete: [],
    cameras: [],
    fixtures: [],
    devices: [],
    cables: [],
    bedarf: [],
    deckung: [],
    anschluesse: [],
  }
}

/**
 * Den Bedarf aus dem Plan-Inhalt ableiten.
 *
 * Zusammengefasst wird ueber das MODELL, nie ueber den Namen. Das ist die
 * Lehre aus ADR-002: `seedFromEquipment` schluesselte ueber `eq.name`, und
 * „Kamera 1" und „Kamera 2" wurden dadurch zu zwei Lagerpositionen à 1 Stueck
 * fuer das, was in Wahrheit ein Modell mit Menge 2 ist.
 *
 * Geraete OHNE Modell werden deshalb auch nicht ersatzweise ueber den Namen
 * zusammengefasst — sie bleiben je Geraet eine Zeile mit `modellUnbekannt`.
 * Zwei namenlose Geraete sind zwei unbekannte Geraete; sie zu Menge 2 zu
 * addieren waere dieselbe Falschaussage wie damals, nur in die andere
 * Richtung.
 */
export function deriveBedarf(
  seed: Pick<SuiteSeed, 'cameras' | 'fixtures' | 'devices'>,
  /**
   * Ids aus `devices`, die fuer ein Objekt stehen, das schon in `cameras` oder
   * `fixtures` steht (`SignalNode.represents`, B-18).
   *
   * Ohne sie waere der Bedarf doppelt: der Knoten „CAM 2 — Sony FX9" im
   * Signalweg und die Kamera „CAM 2" im Kameraplan sind DASSELBE BLECH in
   * zwei Gewerken, und das Lager bekaeme zwei Geraete angefordert, wo eines
   * steht. Der Seed traegt `represents` bewusst nicht mit — die Aufloesung
   * ueber die Gewerks-Grenze gehoert in die Shell (B-18), und deshalb reicht
   * sie das Ergebnis herein statt der Regel.
   */
  vertretene: ReadonlySet<string> = new Set(),
): SeedBedarf[] {
  const zeilen = new Map<string, SeedBedarf>()
  const offen: SeedBedarf[] = []

  const aufnehmen = (
    fromDomain: SeedDomain,
    id: string,
    name: string,
    model: string | undefined,
    category?: string,
  ) => {
    const modell = model?.trim()
    if (!modell) {
      offen.push({
        key: `unbekannt:${fromDomain}:${id}`,
        label: name,
        category,
        quantity: 1,
        fromDomain,
        modellUnbekannt: true,
      })
      return
    }
    const key = modell.toLowerCase()
    const vorhanden = zeilen.get(key)
    if (vorhanden) vorhanden.quantity += 1
    else zeilen.set(key, { key, label: modell, category, quantity: 1, fromDomain })
  }

  for (const c of seed.cameras) aufnehmen('cameras', c.id, c.name, c.model, 'camera')
  for (const f of seed.fixtures) aufnehmen('fixtures', f.id, f.name, f.model, 'fixture')
  for (const d of seed.devices) {
    if (vertretene.has(d.id)) continue
    aufnehmen('signal', d.id, d.name, d.model)
  }

  return [...zeilen.values(), ...offen]
}

/** Formprüfung fuer alles, was ueber den Bus hereinkommt. */
export function isSuiteSeed(value: unknown): value is SuiteSeed {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<SuiteSeed>
  return (
    s.kind === SUITE_SEED_KIND &&
    s.formatVersion === SUITE_SEED_VERSION &&
    typeof s.revision === 'number' &&
    !!s.venue &&
    Array.isArray(s.cameras) &&
    Array.isArray(s.fixtures) &&
    Array.isArray(s.devices) &&
    Array.isArray(s.cables) &&
    Array.isArray(s.bedarf) &&
    Array.isArray(s.deckung) &&
    Array.isArray(s.anschluesse)
  )
}

/**
 * Wieviel Inhalt traegt dieser Seed? Die Zahl ist die Entscheidungsgrundlage
 * fuer „lohnt es, den Planer damit zu befuellen" — und die Groesse, die der
 * Smoke-Test misst, damit ein leer bleibender Planer wieder auffaellt.
 */
export function seedContentCount(seed: SuiteSeed): number {
  // ÜBER `geraete` UND NICHT ÜBER DIE DREI SICHTEN (ADR-011, Stufe 2).
  //
  // Eine Kamera steht in `cameras` UND in `devices` — sie zu addieren hiesse,
  // sie zweimal zu zaehlen. Gemessen am 2026-09-19: ein Seed mit drei
  // Geraeten und einem Kabel meldete `6` statt `4`. Die Zahl entscheidet
  // ausserdem, ob ein Planer einen Seed als „leer" behandelt, und ein zu
  // voller Seed ist dort die gefaehrlichere Richtung.
  //
  // `bedarf` zaehlt aus demselben Grund nicht mit: er ist abgeleitet.
  return seed.geraete.length + seed.cables.length
}

// Das Einarbeiten einer Rueckmeldung steht NICHT hier, sondern in
// `seedOwnership.ts` als `mergeSeedPatch`. Bis 2026-09-08 gab es an dieser
// Stelle ein `applySeedPatch`, das die gemeldete Domaene stillschweigend
// ersetzte. Das war richtig, solange jede Domaene genau einen Schreiber hatte
// — und falsch, sobald der Raum zurueckkommt, den zwei Planer bearbeiten.
//
// Die Funktion ist ersetzt und nicht daneben stehen geblieben: ein zweiter,
// stiller Weg ins selbe Ziel ist genau die Form, an der E-21 haengt. Wer den
// Rueckgabewert von `mergeSeedPatch` auf `.seed` verkuerzt, hat ihn wieder —
// darum gibt der Merge Befunde und Seed als EIN Ergebnis zurueck.

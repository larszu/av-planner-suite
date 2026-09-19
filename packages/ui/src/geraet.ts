// ───────────────────────────────────────────────────────────────────────────
// EIN Geraet, viele Plaene — und die Kategorie sagt, welche.
//
// ─── DIE ENTSCHEIDUNG (Eigentuemer, 2026-09-19) ────────────────────────────
//
//   „Alle Geräte sind in allen Planern verfügbar. Also alle Kameras aus
//    Multicam planner sind auch in Cable planner. Es gibt nur ein
//    universelles device pro Gerät und nicht pro planner. Dieses device hat
//    alle Felder und Inhalte von Cable planner, multicam planner, light
//    planner und allen anderen Planern. […] Damit ist jedes Gerät
//    identifizierbar durch eine id und durch die Kategorie lässt es sich
//    zuordnen."
//
// Das ist keine neue Anforderung, sondern ADR-001 eine Ebene hoeher. Dort
// steht woertlich: „Jedes reale Ding bekommt genau einen Datensatz; jedes
// Label, Blatt, Export und jede Geraete-Konfiguration ist eine Darstellung
// davon, nie eine zweite Wahrheit." Der `suite-seed` hielt sich daran
// INNERHALB eines Planers und brach es dazwischen: `cameras`, `fixtures` und
// `devices` waren drei Listen mit drei Eigentuemern, und dasselbe Blech stand
// in zweien davon — als zwei Datensaetze, die nur eine Namensaehnlichkeit
// verband.
//
// ─── WAS DARAUS FOLGT, UND WAS NICHT ───────────────────────────────────────
//
// Die drei Listen verschwinden nicht sofort, sie werden ABGELEITET. Ein
// Umbau, der sie gleichzeitig in drei Planern austauscht, waere ein Tag ohne
// lauffaehigen Stand; abgeleitet dagegen gibt es ab sofort genau eine
// Wahrheit im Seed, und die Planer ziehen einzeln nach. Genau diese
// Reihenfolge verlangt ADR-001 („eine Identitaet, viele Projektionen").
//
// WAS DAMIT NICHT GEMEINT IST: die Eigentumsregel. Dass alle Planer dasselbe
// Geraet SEHEN, heisst nicht, dass alle alles daran SCHREIBEN duerfen. Die
// Brennweite gehoert dem Kameraplan, die DMX-Adresse dem Lichtplan, die Ports
// dem Signalplan. Sie wandert deshalb von „je Liste" auf „je Feldgruppe" —
// dieselbe Zusicherung, eine Ebene feiner.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────

/**
 * In welchem Plan ein Geraet auftaucht.
 *
 * MEHRERE ZUGLEICH, und das ist der Punkt. Eine Kamera steht im Kameraplan
 * (Standort, Bildwinkel) UND im Signalplan (sie hat Anschluesse und haengt an
 * Kabeln). Ein Movinglight steht im Lichtplan UND im Signalplan (DMX kommt
 * ueber ein Kabel). Ein Mischer steht nur im Signalplan. Ein „entweder/oder"
 * waere genau die Trennung, die dieses Modul aufhebt.
 */
export type Gewerk = 'kamera' | 'licht' | 'signal'

/**
 * Welche Plaene eine Katalog-Kategorie betrifft.
 *
 * Die Schluessel sind die Kategorien, wie die Kataloge sie fuehren — WOERTLICH
 * und nicht als Teiltext. „Video Converter" enthaelt „Video", und ein
 * Vergleich auf Teiltexte haette den Konverter in den Kameraplan gestellt.
 *
 * Die Liste ist bewusst kurz: hier stehen nur die Kategorien, die MEHR als
 * den Signalplan betreffen. Alles andere faellt auf die Vorgabe, und die ist
 * `['signal']` — jedes Geraet hat Anschluesse und gehoert in den Plan, der
 * sie fuehrt. Eine Kategorie, die hier fehlt, ist deshalb kein Loch, sondern
 * der Normalfall.
 */
export const KATEGORIE_GEWERKE: Readonly<Record<string, readonly Gewerk[]>> = {
  // Wie die KATALOGE sie fuehren (Datenblatt-Templates, englisch).
  Cameras: ['kamera', 'signal'],
  Lights: ['licht', 'signal'],
  // Wie sie im Eigenschaften-Feld des Cable-Planers heissen — das ist die
  // Liste, aus der ein Mensch waehlt (`categorySchemas.ts`), und seine Wahl
  // ist eine AUSSAGE. ADR-002 verbietet das Raten, nicht das Fragen: „Kamera
  // 1" aus dem Namen zu schliessen waere geraten, „der Nutzer hat Licht
  // angekreuzt" ist gesagt.
  Kameras: ['kamera', 'signal'],
  Licht: ['licht', 'signal'],
}

/** Die Vorgabe fuer jede Kategorie, die oben nicht steht. */
export const GEWERKE_VORGABE: readonly Gewerk[] = ['signal']

/**
 * Welche Plaene zeigen dieses Geraet?
 *
 * Ohne Kategorie gilt die Vorgabe und nicht „gar keiner": ein Geraet ohne
 * Katalog-Zuordnung ist trotzdem ein Geraet im Plan. „Nicht angegeben" ist
 * nicht „nirgends".
 */
export function gewerkeFuer(kategorie: string | undefined): readonly Gewerk[] {
  if (!kategorie) return GEWERKE_VORGABE
  return KATEGORIE_GEWERKE[kategorie] ?? GEWERKE_VORGABE
}

/** Steht dieses Geraet im Plan dieses Gewerks? */
export const gehoertZu = (kategorie: string | undefined, gewerk: Gewerk): boolean =>
  gewerkeFuer(kategorie).includes(gewerk)

/** Die Felder, die der KAMERAPLAN fuehrt. */
export interface KameraFelder {
  lens?: string
  focalMm?: number
  hfovDeg?: number
}

/** Die Felder, die der LICHTPLAN fuehrt. */
export interface LichtFelder {
  /** Freitext-Zweck („Key Host", „Fill", „Backlight"). */
  purpose?: string
  /** Dimmer-Stellung in Prozent (0..100). */
  dimmerPct?: number
  dmxChannel?: number
  universe?: number
  /**
   * Haenge-Hoehe ueber dem Boden in Metern, WENN sie jemand gesetzt hat.
   * Fehlt sie, heisst das „nicht angegeben" und nicht „haengt am Boden" —
   * die Stueckliste rechnete sonst die Kabel zu kurz.
   */
  rigHeightM?: number
}

/**
 * EIN Geraet. Nicht eines je Planer.
 *
 * Die gemeinsamen Felder stehen oben, die gewerksspezifischen in benannten
 * Gruppen. Die Gruppen sind kein Ordnungsspleen: sie sind die Einheit, in der
 * das EIGENTUM gilt. „Der Kameraplan darf `kamera` schreiben" ist eine Regel,
 * die man aufschreiben und pruefen kann; „der Kameraplan darf `lens`,
 * `focalMm` und `hfovDeg` schreiben" ist eine Liste, die beim naechsten Feld
 * veraltet, ohne dass es jemand merkt.
 */
export interface SeedGeraet {
  id: string
  name: string
  /**
   * Die Kategorie, wie der Katalog sie fuehrt („Cameras", „Video Mixer",
   * „Monitors"). Sie ordnet das Geraet den Plaenen zu (`gewerkeFuer`).
   *
   * Optional, weil sie fehlen kann: ein von Hand angelegtes Geraet hat keine
   * Katalog-Zuordnung. Dann gilt die Vorgabe — geraten wird nichts, schon gar
   * nicht aus dem Namen (ADR-002).
   */
  kategorie?: string
  /** Das Katalog-MODELL („Sony FX9"), nicht der Instanzname („Kamera 1"). */
  model?: string
  /** Zweite Zeile am Knoten („3x SDI Out"). Beschreibung, keine Port-Angabe. */
  subtitle?: string
  /**
   * Lage im Raum (Meter). GETEILT: Kameraplan, Lichtplan und Stueckliste
   * meinen dieselbe Stelle. Fehlt sie, ist das Geraet noch nicht platziert —
   * nicht „am Nullpunkt".
   */
  x?: number
  y?: number
  /** Normalisierte Lage im Signalfluss-Diagramm (0..1). */
  nx?: number
  ny?: number
  kamera?: KameraFelder
  licht?: LichtFelder
  /**
   * GERUEST fuer die Uebergangszeit: unter welcher Id dieses Geraet in den
   * alten Sichten erscheint, solange die Planer noch auf ihren eigenen
   * Listen stehen.
   *
   * Der Kameraplan kennt `cam2`, der Signalplan `n_cam2` — dasselbe Blech,
   * zwei Id-Raeume. Naehme die Sicht ploetzlich die Knoten-Id, waere jede
   * Kamera in jedem bestehenden Projekt eine neue, samt verlorener
   * Ausrichtung und Brennweite.
   *
   * Faellt weg, sobald der letzte Planer auf `geraete` steht.
   */
  altIds?: { kamera?: string; licht?: string }
}

// ───────────────────────────────────────────────────────────────────────────
// DIE PROJEKTIONEN
//
// `cameras`, `fixtures` und `devices` bleiben im Seed — aber nicht mehr als
// Listen, die jemand fuehrt, sondern als Sichten auf die eine. Ein Planer,
// der noch auf seiner Liste steht, sieht davon nichts; und solange er es
// nicht tut, kann er auch nicht mehr mit ihr aus dem Tritt geraten.
//
// Warum ueberhaupt noch: ein Umbau, der die drei Listen gleichzeitig in drei
// Planern austauscht, waere ein Tag ohne lauffaehigen Stand. So gibt es ab
// sofort eine Wahrheit, und die Planer ziehen einzeln nach.
// ───────────────────────────────────────────────────────────────────────────
import type { SeedCamera, SeedDevice, SeedFixture } from './seed'

/** Nur die Felder mitnehmen, die gesetzt sind — `undefined` heisst „keine
 *  Aussage" und soll auch in der Sicht keine werden. */
const wenn = <T>(wert: T | undefined, feld: string): Record<string, T> =>
  wert === undefined ? {} : ({ [feld]: wert } as Record<string, T>)

/**
 * Steht dieses Geraet im Plan dieses Gewerks?
 *
 * ZWEI GRUENDE, und der zweite ist der, den ein Wächter am 2026-09-19 aus dem
 * Headless-Smoke herausgeholt hat:
 *
 *  1. Die KATEGORIE sagt es (`gewerkeFuer`).
 *  2. Das Geraet TRAEGT die Felder dieses Gewerks. Wer eine Brennweite hat,
 *     steht im Kameraplan — was immer in seiner Kategorie steht.
 *
 * Ohne den zweiten Grund verschwand die Kamera `CAM 1` aus dem Kameraplan,
 * sobald der Signal-Planer den Knoten einmal zurueckgemeldet hatte: seine
 * Meldung traegt die Kategorie, die ER fuehrt (fuer ein nicht aufgeloestes
 * Geraet „Other"), und die ueberschrieb die Zuordnung, die aus der
 * ERKLAERTEN Entsprechung stammte. Eine Kategorie ist eine Auskunft ueber
 * den Typ; `represents` ist eine Entscheidung eines Menschen darueber, dass
 * dieses Blech jene Kamera IST. Die Entscheidung wiegt schwerer, und die
 * Feldgruppe ist ihre Spur im Datensatz.
 *
 * Die Vereinigung und nicht der Vorrang: ein Geraet kann aus beiden Gruenden
 * dazugehoeren, und keiner von beiden nimmt dem anderen etwas weg.
 */
const imPlan = (g: SeedGeraet, gewerk: Gewerk): boolean =>
  gehoertZu(g.kategorie, gewerk) ||
  (gewerk === 'kamera' && g.kamera !== undefined) ||
  (gewerk === 'licht' && g.licht !== undefined)

/** Sicht des Kameraplans. */
export function alsKameras(geraete: readonly SeedGeraet[]): SeedCamera[] {
  return geraete
    .filter((g) => imPlan(g, 'kamera'))
    .map((g) => ({
      id: g.altIds?.kamera ?? g.id,
      name: g.name,
      ...wenn(g.model, 'model'),
      ...wenn(g.kamera?.lens, 'lens'),
      ...wenn(g.kamera?.focalMm, 'focalMm'),
      ...wenn(g.kamera?.hfovDeg, 'hfovDeg'),
      ...wenn(g.x, 'x'),
      ...wenn(g.y, 'y'),
    }))
}

/** Sicht des Lichtplans. */
export function alsLeuchten(geraete: readonly SeedGeraet[]): SeedFixture[] {
  return geraete
    .filter((g) => imPlan(g, 'licht'))
    .map((g) => ({
      id: g.altIds?.licht ?? g.id,
      name: g.name,
      ...wenn(g.model, 'model'),
      ...wenn(g.licht?.purpose, 'purpose'),
      ...wenn(g.licht?.dimmerPct, 'dimmerPct'),
      ...wenn(g.licht?.dmxChannel, 'dmxChannel'),
      ...wenn(g.licht?.universe, 'universe'),
      ...wenn(g.licht?.rigHeightM, 'rigHeightM'),
      ...wenn(g.x, 'x'),
      ...wenn(g.y, 'y'),
    }))
}

/**
 * Sicht des Signalplans — und die ist NICHT gefiltert.
 *
 * Jedes Geraet hat Anschluesse und haengt an Kabeln; eine Kamera, die im
 * Signalplan fehlte, waere genau die Luecke, aus der die Frage des
 * Eigentuemers entstand. `gehoertZu(…, 'signal')` steht trotzdem in der
 * Filterzeile und nicht nur als Kommentar: waere eines Tages eine Kategorie
 * wirklich planlos, entschiede die Tabelle darueber und nicht diese Datei.
 */
export function alsSignalGeraete(geraete: readonly SeedGeraet[]): SeedDevice[] {
  return geraete
    .filter((g) => imPlan(g, 'signal'))
    .map((g) => ({
      id: g.id,
      name: g.name,
      ...wenn(g.subtitle, 'subtitle'),
      ...wenn(g.model, 'model'),
      ...wenn(g.nx, 'nx'),
      ...wenn(g.ny, 'ny'),
      ...wenn(g.x, 'x'),
      ...wenn(g.y, 'y'),
      ...wenn(g.kategorie, 'kategorie'),
    }))
}

// ───────────────────────────────────────────────────────────────────────────
// DER WEG HIN: aus drei Listen eine machen
//
// Solange die Shell ihr Projekt noch in drei Listen fuehrt, muss jemand sie
// zusammenlegen — und zwar ohne zu raten. Die einzige erlaubte Bruecke ist
// die ERKLAERTE (`SignalNode.represents`, B-18/ADR-002): sie sagt, dass
// dieser Knoten und jene Kamera dasselbe Blech sind. Wo niemand es erklaert
// hat, entstehen zwei Geraete — und das ist die richtige Antwort, nicht ein
// Mangel: zwei Datensaetze ohne erklaerte Verbindung SIND zwei Dinge, bis
// jemand etwas anderes sagt.
//
// ─── WARUM DIE ALTEN IDs MITFAHREN ─────────────────────────────────────────
//
// Das zusammengelegte Geraet hat genau EINE Id. Die Planer stehen aber noch
// auf ihren eigenen Listen und kennen dort ihre eigene: der Kameraplan kennt
// `cam2`, der Signalplan `n_cam2`. Wuerde die Sicht ploetzlich die andere
// nennen, waere jede Kamera in jedem bestehenden Projekt eine neue — samt
// verlorener Ausrichtung, Brennweite und Hoehe.
//
// `altIds` traegt sie deshalb durch die Uebergangszeit. Es ist GERUEST und
// kein Modell: sobald der letzte Planer auf `geraete` steht, faellt es weg,
// und die Zeile hier faellt mit.
// ───────────────────────────────────────────────────────────────────────────

/** Ein Geraet, wie der Kameraplan es heute fuehrt. */
export interface ZuKamera extends KameraFelder {
  id: string
  name: string
  model?: string
  x?: number
  y?: number
}

/** Ein Geraet, wie der Lichtplan es heute fuehrt. */
export interface ZuLeuchte extends LichtFelder {
  id: string
  name: string
  model?: string
  x?: number
  y?: number
}

/** Ein Knoten, wie der Signalplan ihn heute fuehrt. */
export interface ZuKnoten {
  id: string
  name: string
  subtitle?: string
  model?: string
  kategorie?: string
  nx?: number
  ny?: number
  /** Die ERKLAERTE Entsprechung — die einzige erlaubte Bruecke. */
  represents?: { kind: 'camera' | 'fixture'; id: string }
}

/**
 * Drei Listen zu einer.
 *
 * Reihenfolge: erst die Knoten (der Signalplan fuehrt die Hardware), dann was
 * in keinem Knoten aufgegangen ist. Fest und nicht sortiert — derselbe Baum
 * ergibt dieselbe Liste (ADR-004), und die Ordnung des Plans ist die, die ein
 * Mensch wiedererkennt.
 */
export function geraeteAus(
  knoten: readonly ZuKnoten[],
  kameras: readonly ZuKamera[],
  leuchten: readonly ZuLeuchte[],
): SeedGeraet[] {
  const kameraJeId = new Map(kameras.map((k) => [k.id, k]))
  const leuchteJeId = new Map(leuchten.map((l) => [l.id, l]))
  const verbraucht = new Set<string>()

  const ausKnoten = knoten.map((n): SeedGeraet => {
    const k = n.represents?.kind === 'camera' ? kameraJeId.get(n.represents.id) : undefined
    const l = n.represents?.kind === 'fixture' ? leuchteJeId.get(n.represents.id) : undefined
    if (k) verbraucht.add(k.id)
    if (l) verbraucht.add(l.id)
    return {
      id: n.id,
      name: n.name,
      // Die Kategorie des Knotens gewinnt, wenn er eine hat; sonst sagt die
      // erklaerte Entsprechung, worum es sich handelt. Beides ist eine
      // Aussage und keine Ableitung aus dem Namen.
      ...wenn(n.kategorie ?? (k ? 'Cameras' : l ? 'Lights' : undefined), 'kategorie'),
      ...wenn(n.model ?? k?.model ?? l?.model, 'model'),
      ...wenn(n.subtitle, 'subtitle'),
      ...wenn(n.nx, 'nx'),
      ...wenn(n.ny, 'ny'),
      ...wenn(k?.x ?? l?.x, 'x'),
      ...wenn(k?.y ?? l?.y, 'y'),
      ...(k ? { kamera: kameraFelder(k) } : {}),
      ...(l ? { licht: lichtFelder(l) } : {}),
      ...(k || l ? { altIds: { ...(k ? { kamera: k.id } : {}), ...(l ? { licht: l.id } : {}) } } : {}),
    }
  })

  // Was in keinem Knoten aufging: eine Kamera, die nur im Kameraplan steht,
  // ist ein Geraet — sie hat nur noch keinen Platz im Signalweg.
  const ausKameras = kameras
    .filter((k) => !verbraucht.has(k.id))
    .map((k): SeedGeraet => ({
      id: k.id,
      name: k.name,
      kategorie: 'Cameras',
      ...wenn(k.model, 'model'),
      ...wenn(k.x, 'x'),
      ...wenn(k.y, 'y'),
      kamera: kameraFelder(k),
    }))

  const ausLeuchten = leuchten
    .filter((l) => !verbraucht.has(l.id))
    .map((l): SeedGeraet => ({
      id: l.id,
      name: l.name,
      kategorie: 'Lights',
      ...wenn(l.model, 'model'),
      ...wenn(l.x, 'x'),
      ...wenn(l.y, 'y'),
      licht: lichtFelder(l),
    }))

  return [...ausKnoten, ...ausKameras, ...ausLeuchten]
}

const kameraFelder = (k: ZuKamera): KameraFelder => ({
  ...wenn(k.lens, 'lens'),
  ...wenn(k.focalMm, 'focalMm'),
  ...wenn(k.hfovDeg, 'hfovDeg'),
})

const lichtFelder = (l: ZuLeuchte): LichtFelder => ({
  ...wenn(l.purpose, 'purpose'),
  ...wenn(l.dimmerPct, 'dimmerPct'),
  ...wenn(l.dmxChannel, 'dmxChannel'),
  ...wenn(l.universe, 'universe'),
  ...wenn(l.rigHeightM, 'rigHeightM'),
})

// ───────────────────────────────────────────────────────────────────────────
// Shell-Seite des Projekt-Flusses: `SuiteProject` <-> `suite-seed`.
//
// Die Shell fuehrt ihr Projekt weiter in ihrem eigenen, absichtlich einfachen
// Modell (`SuiteProject`) — daran haengen Dashboard, Eigenschaften-Panel,
// Vorschauen und Statusleiste. Der Seed ist die Teilmenge davon, die einen
// eingebetteten Planer ueberhaupt etwas angeht: Raum, Kameras, Leuchten,
// Signalknoten, Kabel.
//
// Zwei Richtungen, beide verlustarm statt verlustfrei — und das mit Absicht:
//
//   hin    `suiteToSeed`   nimmt nur Felder, fuer die die Shell eine Quelle
//                          hat. Was der Planer mehr weiss (Ports, Datenblatt,
//                          DMX-Universum, Rigging-Hoehe), erfindet die Shell
//                          nicht.
//
//   zurueck `applyPatchToSuite`  laesst `mergeSeedPatch` (E-21) entscheiden,
//                          was der Planer aendern DARF, und schreibt das
//                          Ergebnis ins Shell-Modell zurueck — je Objekt-Id
//                          unter Erhalt der Shell-eigenen Felder, die im Seed
//                          gar nicht vorkommen (`SignalNode.group`, `.venue`,
//                          `Camera.linked`). Ein Planer, der diese Felder nicht
//                          kennt, darf sie nicht loeschen — genau daran ist die
//                          Bruecke sonst ein Datenverlust statt einer
//                          Verbindung.
//
// DER RAUM GEHT SEIT 2026-09-08 AUCH ZURUECK (B-39, Punkt 1). Er ist das
// einzige geteilte Stueck: MultiCam vermisst ihn fuer die Sichtlinien, Licht
// fuer die Rigging-Punkte. Er kommt deshalb nicht einfach an — er laeuft durch
// die Konfliktregel, und was ihr widerspricht, wird zu einem BEFUND am
// Projekt statt zu einer stillen Ueberschreibung.
// ───────────────────────────────────────────────────────────────────────────

import {
  SUITE_SEED_KIND,
  SUITE_SEED_VERSION,
  alsKameras,
  alsLeuchten,
  alsSignalGeraete,
  deriveBedarf,
  geraeteAus,
  mergeSeedPatch,
  type SeedDomain,
  type SeedPatch,
  type SuiteSeed,
} from '@avplan/ui/embed'
import type {
  Cable,
  CableLayer,
  Camera,
  Fixture,
  SeedConflictRecord,
  SeedHandoffRecord,
  SignalNode,
  SuiteProject,
} from './project'

/**
 * Kabel-Ebene aus dem Kabeltyp ableiten. Nur fuer Kabel noetig, die ein Planer
 * NEU angelegt hat — bei bekannten Ids gewinnt die bereits gefuehrte Ebene.
 * Bewusst grob: die Shell nutzt `layer` allein zum Einfaerben und Filtern.
 */
export function layerForCableType(type: string): CableLayer {
  const t = type.toLowerCase()
  if (t.includes('dmx') || t.includes('artnet') || t.includes('art-net') || t.includes('sacn')) return 'dmx'
  if (t.includes('cat') || t.includes('ethernet') || t.includes('rj45') || t.includes('lan')) return 'net'
  return 'video'
}

/** Projekt → Seed. `revision` kommt von aussen (siehe `useSuiteSeed`). */
export function suiteToSeed(
  project: SuiteProject | null,
  revision: number,
  /**
   * Woher dieser Stand kommt, wenn ihn die Meldung eines Planers ausgeloest
   * hat. Der MELDER erkennt daran seinen eigenen Hall und uebernimmt ihn
   * nicht; alle anderen bekommen ihn (siehe `origin` in `@avplan/ui`).
   */
  origin?: SeedDomain,
): SuiteSeed {
  if (!project) {
    return {
      kind: SUITE_SEED_KIND,
      formatVersion: SUITE_SEED_VERSION,
      revision,
      ...(origin ? { origin } : {}),
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

  // ── EINE Liste, drei Sichten (ADR-011) ───────────────────────────────────
  //
  // Bis 2026-09-19 standen hier drei `map`s nebeneinander, und dasselbe Blech
  // stand in zweien davon: die Kamera `cam2` und ihr Knoten `n_cam2` waren
  // zwei Datensaetze. Genau die zweite Wahrheit, gegen die ADR-001
  // geschrieben ist — nur eine Ebene hoeher als dort gemessen.
  //
  // Zusammengelegt wird ueber die ERKLAERTE Entsprechung (`represents`) und
  // nur ueber sie. Wo niemand sie erklaert hat, bleiben es zwei Geraete; das
  // ist die richtige Antwort und kein Mangel.
  const geraete = geraeteAus(
    project.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      subtitle: n.sub,
      nx: n.nx,
      ny: n.ny,
      ...(n.kategorie ? { kategorie: n.kategorie } : {}),
      ...(n.model ? { model: n.model } : {}),
      ...(n.represents ? { represents: n.represents } : {}),
    })),
    project.cameras,
    project.fixtures,
  )
  const cameras = alsKameras(geraete)
  const fixtures = alsLeuchten(geraete)
  const devices = alsSignalGeraete(geraete)

  return {
    kind: SUITE_SEED_KIND,
    formatVersion: SUITE_SEED_VERSION,
    revision,
    ...(origin ? { origin } : {}),
    projectName: project.meta.name,
    venue: {
      name: project.meta.venue,
      widthM: project.hall.w,
      heightM: project.hall.h,
      stage: project.stage,
    },
    geraete,
    cameras,
    fixtures,
    devices,
    cables: project.cables.map((c) => ({
      id: c.id,
      label: c.label,
      type: c.type,
      lengthM: c.lengthM,
      from: c.from,
      to: c.to,
    })),
    // Der Bedarf wird bei JEDEM Senden neu gerechnet und nie im Projekt
    // gefuehrt (ADR-001: eine gespeicherte Ableitung ist eine zweite
    // Wahrheit). Die Knoten, die fuer eine Kamera oder Leuchte stehen, gehen
    // dabei heraus — sonst fordert das Lager zwei Geraete an, wo eines steht.
    bedarf: deriveBedarf({ cameras, fixtures, devices }, vertreteneKnoten(project.nodes)),
    // Die Deckung kommt vom Lager und wird deshalb GEFUEHRT: sie ist keine
    // Ableitung aus dem Plan, sondern die Antwort einer anderen App. Fehlt
    // sie, hat noch niemand nachgesehen — nicht „nichts vorhanden".
    deckung: project.deckung ?? [],
    // Dasselbe fuer die Anschlusspunkte des Hauses: eine Auskunft des
    // Gebaeude-Werkzeugs, keine Ableitung aus dem Plan.
    anschluesse: project.anschluesse ?? [],
    // Wer welches geteilte Feld haelt, faehrt mit: ohne diesen Teil koennte
    // `mergeSeedPatch` keinen Halter erkennen und wuerde jede Setzung
    // durchlassen — die Regel waere gebaut und unwirksam.
    holds: project.seedHolds,
  }
}

/**
 * Die Knoten-Ids, die fuer ein Objekt eines anderen Gewerks stehen (B-18).
 *
 * Sie stehen hier und nicht in `@avplan/ui`, weil `represents` ein Feld des
 * SHELL-Modells ist: die Aufloesung ueber die Gewerks-Grenze gehoert in die
 * Shell, der Planer kennt nur seinen eigenen Id-Raum.
 */
function vertreteneKnoten(nodes: readonly SignalNode[]): Set<string> {
  const out = new Set<string>()
  for (const n of nodes) if (n.represents) out.add(n.id)
  return out
}

/**
 * Der Fingerabdruck des Teils, den die Planer sehen. Aendert er sich, ist ein
 * neuer Seed faellig; aendert sich nur Crew/Budget/Board, nicht.
 */
export function seedSignature(project: SuiteProject | null): string {
  return JSON.stringify(suiteToSeed(project, 0))
}

/**
 * Das Ergebnis einer Rueckmeldung: das Projekt UND die Befunde. Beides
 * zusammen und nicht nacheinander — ein Aufrufer, der nur das Projekt nimmt,
 * hat das stille Ueberschreiben wieder, nur an einer Stelle weiter oben.
 */
export interface PatchAufSuite {
  project: SuiteProject
  /** Leer heisst „nichts zu melden", nicht „nichts passiert". */
  conflicts: SeedConflictRecord[]
  /**
   * Die angebotene Uebergabe an die ANDEREN Planer, wenn sich am Inhalt
   * wirklich etwas geaendert hat. `undefined` heisst „nichts zu uebergeben"
   * — eine Meldung, die nur bestaetigt, was ohnehin dastand, soll niemanden
   * fragen.
   */
  handoff?: SeedHandoffRecord
}

/**
 * Rueckmeldung eines Planers in das Shell-Projekt einarbeiten.
 *
 * `revision` ist der Stand, den die Shell gerade fuehrt — nicht der aus dem
 * Patch. Genau daran haengt die Verwerfung ueberholter Meldungen: ein Planer,
 * der auf einem aelteren Seed aufsetzte, darf neueren Inhalt nicht
 * ueberschreiben.
 *
 * `now` und `id` kommen von aussen, damit die Rechnung rein bleibt (dieselbe
 * Trennung wie beim Ablauf-Import).
 */
export function applyPatchToSuite(
  project: SuiteProject,
  patch: SeedPatch,
  revision: number,
  now: () => number = Date.now,
  id: (n: number) => string = (n) => `sc${n}`,
): PatchAufSuite {
  const vorher = suiteToSeed(project, revision)
  const { seed, conflicts } = mergeSeedPatch(vorher, patch)

  const befunde: SeedConflictRecord[] = conflicts.map((conflict, i) => ({
    id: id(now() + i),
    seenAt: now(),
    conflict,
  }))

  if (seed === vorher) {
    // Nichts uebernommen. Befunde koennen es trotzdem geben — genau das ist
    // der Fall, den E-21 sichtbar machen soll: der Planer hat etwas gemeldet,
    // und es ist NICHT eingezogen.
    return befunde.length
      ? { project: { ...project, seedConflicts: [...(project.seedConflicts ?? []), ...befunde] }, conflicts: befunde }
      : { project, conflicts: [] }
  }

  // Zurueck ins Shell-Modell. Gearbeitet wird auf dem GEMERGTEN Seed und nicht
  // auf dem Patch: was die Regel abgelehnt hat, steht dort gar nicht erst
  // drin, und diese Funktion muss die Regel nicht ein zweites Mal kennen.
  const alteKameras = new Map(project.cameras.map((c) => [c.id, c]))
  const cameras: Camera[] = seed.cameras.map((c) => {
    const alt = alteKameras.get(c.id)
    return {
      id: c.id,
      name: c.name,
      model: c.model ?? alt?.model ?? '',
      lens: c.lens ?? alt?.lens ?? '',
      focalMm: c.focalMm ?? alt?.focalMm ?? 0,
      hfovDeg: c.hfovDeg ?? alt?.hfovDeg ?? 0,
      // KEIN `?? 0`: eine Kamera ohne Position ist nicht in der Ecke der
      // Halle, sondern noch nicht platziert. Bis 2026-09-19 stand hier die
      // Null, und die Vorschau zeichnete sie als Tatsache.
      ...(c.x ?? alt?.x) !== undefined ? { x: c.x ?? alt?.x } : {},
      ...(c.y ?? alt?.y) !== undefined ? { y: c.y ?? alt?.y } : {},
      // `linked` kennt der Seed nicht — bei bekannten Kameras erhalten,
      // bei neuen ist „noch nicht verkabelt" die wahre Aussage.
      linked: alt?.linked ?? false,
    }
  })

  const alteLeuchten = new Map(project.fixtures.map((f) => [f.id, f]))
  const fixtures: Fixture[] = seed.fixtures.map((f) => {
    const alt = alteLeuchten.get(f.id)
    return {
      id: f.id,
      name: f.name,
      model: f.model ?? alt?.model ?? '',
      purpose: f.purpose ?? alt?.purpose ?? '',
      dimmerPct: f.dimmerPct ?? alt?.dimmerPct ?? 0,
      dmxChannel: f.dmxChannel ?? alt?.dmxChannel ?? 0,
      x: f.x ?? alt?.x ?? 0,
      y: f.y ?? alt?.y ?? 0,
      // Die Haenge-Hoehe bleibt WEG, wenn niemand sie kennt — und wird nicht
      // auf 0 gesetzt wie die Felder darueber. Bei den anderen ist die 0 ein
      // brauchbarer Anfangswert (kein Dimmer, kein Kanal); bei einer Hoehe
      // waere sie die Behauptung „haengt am Boden", und die Stueckliste
      // rechnete daraufhin die Kabel zu kurz.
      ...(f.rigHeightM ?? alt?.rigHeightM) !== undefined
        ? { rigHeightM: f.rigHeightM ?? alt?.rigHeightM }
        : {},
    }
  })

  // ── Der Signalplan sieht jetzt ALLE Geraete, aendern darf er nur SEINE ──
  //
  // Seit ADR-011 traegt die Sicht `devices` auch die Kameras und Leuchten:
  // genau das war der Auftrag („alle Kameras aus Multicam planner sind auch
  // in Cable planner"). Auf dem Rueckweg kommen sie mit zurueck — und wuerden
  // hier zu KNOTEN, weil diese Abbildung `seed.devices` auf `project.nodes`
  // legt. Beim naechsten Senden stuenden Kamera und Knoten wieder als zwei
  // Datensaetze da, ohne erklaerte Verbindung: die zweite Wahrheit, die das
  // ADR gerade abgeschafft hat, nach einem Rundlauf zurueck.
  //
  // Das ist keine Sonderregel, sondern die Eigentumsregel an der Stelle, an
  // der sie ohnehin gilt: der Signal-Planer darf `cameras` und `fixtures`
  // nicht schreiben (`mergeSeedPatch`). Eine Kamera, die als Geraet
  // zurueckkommt, ist deshalb nicht seine — sie wird gelesen und nicht
  // uebernommen.
  const fremdeIds = new Set([
    ...project.cameras.map((c) => c.id),
    ...project.fixtures.map((f) => f.id),
  ])
  const alteKnoten = new Map(project.nodes.map((n) => [n.id, n]))
  const nodes: SignalNode[] = seed.devices.filter((d) => !fremdeIds.has(d.id)).map((d) => {
    const alt = alteKnoten.get(d.id)
    return {
      id: d.id,
      name: d.name,
      sub: d.subtitle ?? alt?.sub ?? '',
      // `group`/`venue` sind Shell-Begriffe (Bodennaehe vs. Regie,
      // steht im Raum). Der Cable-Planer kennt sie nicht und darf sie
      // deshalb weder setzen noch verlieren.
      group: alt?.group ?? 'floor',
      venue: alt?.venue ?? true,
      nx: d.nx ?? alt?.nx ?? 0.5,
      ny: d.ny ?? alt?.ny ?? 0.5,
      // `represents` ging hier bis 2026-09-18 VERLOREN. Der Seed traegt es
      // nicht (die Aufloesung ueber die Gewerks-Grenze gehoert in die Shell,
      // B-18), und diese Rueckabbildung baute den Knoten Feld fuer Feld neu
      // auf — also fiel es bei jeder Meldung des Signal-Planers heraus.
      //
      // Die Folge war still und genau die aus B-18: die vier Cross-Link-
      // Knoepfe sprangen danach nur noch ins Modul, ohne Auswahl, und der
      // Bedarf zaehlte den Knoten und seine Kamera doppelt. Dasselbe
      // Erhalten-statt-Neubauen gilt hier wie fuer `group` und `venue`.
      ...(alt?.represents ? { represents: alt.represents } : {}),
      // Die Typaussage kommt aus dem Seed, wenn der Planer sie trifft, und
      // bleibt sonst stehen. Sie geht NICHT verloren, wenn ein Planer sie
      // einmal nicht mitschickt — dieselbe Regel wie oben.
      ...((d.kategorie ?? alt?.kategorie) ? { kategorie: d.kategorie ?? alt?.kategorie } : {}),
      ...((d.model ?? alt?.model) ? { model: d.model ?? alt?.model } : {}),
    }
  })

  const alteKabel = new Map(project.cables.map((c) => [c.id, c]))
  const cables: Cable[] = seed.cables.map((c) => {
    const alt = alteKabel.get(c.id)
    return {
      id: c.id,
      label: c.label,
      type: c.type,
      layer: alt?.layer ?? layerForCableType(c.type),
      lengthM: c.lengthM ?? alt?.lengthM ?? 0,
      from: c.from,
      to: c.to,
    }
  })

  const next: SuiteProject = {
    ...project,
    cameras,
    fixtures,
    nodes,
    cables,
    // Der Raum. `venue.name` gehoert der Shell (SEED_VENUE_OWNER) und kommt
    // deshalb hier gar nicht veraendert an — der Fallback ist trotzdem der
    // bisherige Wert und nicht der aus dem Seed geratene.
    hall: { w: seed.venue.widthM ?? project.hall.w, h: seed.venue.heightM ?? project.hall.h },
    stage: seed.venue.stage ?? project.stage,
    meta: { ...project.meta, venue: seed.venue.name || project.meta.venue, saved: false },
    seedHolds: seed.holds,
    seedConflicts: befunde.length ? [...(project.seedConflicts ?? []), ...befunde] : project.seedConflicts,
    // Die Meldung des Lagers. `mergeSeedPatch` hat sie nur uebernommen, wenn
    // sie aus der Lager-Domaene kam — hier steht deshalb keine zweite
    // Zustaendigkeitspruefung, sondern das Ergebnis der ersten.
    deckung: seed.deckung,
    anschluesse: seed.anschluesse,
  }

  /**
   * Was sich fuer die ANDEREN Planer geaendert hat — gezaehlt ueber die drei
   * Inhalts-Listen, die der Seed traegt.
   *
   * ABSICHTLICH UEBER DIE IDs UND NICHT UEBER EINEN TIEFEN VERGLEICH: der
   * Streifen sagt „1 neu, 2 geaendert", und was davon der Nutzer wirklich
   * sehen will, steht im Planer. Ein Feld-fuer-Feld-Vergleich wuerde hier
   * eine Genauigkeit behaupten, die die Zahl gar nicht traegt.
   */
  const zaehle = <T extends { id: string }>(vorherL: T[], nachherL: T[]) => {
    const v = new Map(vorherL.map((x) => [x.id, JSON.stringify(x)]))
    const n = new Map(nachherL.map((x) => [x.id, JSON.stringify(x)]))
    let neu = 0
    let geaendert = 0
    for (const [id, wert] of n) {
      if (!v.has(id)) neu += 1
      else if (v.get(id) !== wert) geaendert += 1
    }
    let entfernt = 0
    for (const id of v.keys()) if (!n.has(id)) entfernt += 1
    return { neu, geaendert, entfernt }
  }
  // AUF DEM SEED GEZAEHLT UND NICHT AUF DEM SHELL-MODELL, und das ist kein
  // Detail: der erste Anlauf verglich `project.cameras` mit der neu gebauten
  // Liste und meldete fuer eine Meldung, die NICHTS aenderte, „2 geaendert".
  // Kein Wunder — die Rueckabbildung normalisiert (`?? ''`, `?? 0`), und zwei
  // Kameras hatten ein Feld, das im Seed gar nicht vorkommt. Gezaehlt gehoert,
  // was der Seed traegt: nur das faehrt zu den anderen Planern.
  const a = zaehle(vorher.cameras, seed.cameras)
  const b = zaehle(vorher.fixtures, seed.fixtures)
  const c = zaehle(vorher.devices, seed.devices)
  const d = zaehle(vorher.cables, seed.cables)
  const summe = {
    neu: a.neu + b.neu + c.neu + d.neu,
    geaendert: a.geaendert + b.geaendert + c.geaendert + d.geaendert,
    entfernt: a.entfernt + b.entfernt + c.entfernt + d.entfernt,
  }
  const handoff: SeedHandoffRecord | undefined =
    summe.neu + summe.geaendert + summe.entfernt > 0
      ? { id: id(now() + 1000), seenAt: now(), domain: patch.domain, zusammenfassung: summe }
      : undefined

  return {
    project: handoff ? { ...next, seedHandoffs: [...(project.seedHandoffs ?? []), handoff] } : next,
    conflicts: befunde,
    handoff,
  }
}

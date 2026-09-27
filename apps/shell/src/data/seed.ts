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

import type { Identitaet } from '@avplan/ui/embed'
import {
  SUITE_SEED_KIND,
  SUITE_SEED_VERSION,
  deriveBedarf,
  mergeSeedPatch,
  type SeedDomain,
  type SeedPatch,
  type SuiteSeed,
} from '@avplan/ui/embed'
import type {
  Cable,
  CableLayer,
  SeedConflictRecord,
  SuiteGeraet,
  SeedHandoffRecord,
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
  /**
   * Wer an DIESEM Rechner arbeitet.
   *
   * Sie faehrt am Seed mit, damit ein Planer eine Aeusserung zeichnen kann,
   * ohne selbst nach einem Namen zu fragen — sonst haette jede App ihren
   * eigenen Benutzer, und derselbe Mensch hiesse im Licht-Planer anders als
   * im Kabel-Planer. Sie gehoert dem RECHNER und nicht dem Projekt: wer die
   * Projektdatei weitergibt, gibt nicht seinen Namen mit.
   */
  autor?: Identitaet,
): SuiteSeed {
  if (!project) {
    return {
      kind: SUITE_SEED_KIND,
      formatVersion: SUITE_SEED_VERSION,
      revision,
      ...(origin ? { origin } : {}),
      ...(autor ? { autor } : {}),
      venue: { name: '' },
      geraete: [],
      cables: [],
      bedarf: [],
      deckung: [],
      anschluesse: [],
    }
  }

  // ── EINE Liste, drei Sichten (ADR-011, Stufe 2) ──────────────────────────
  //
  // Hier stand bis 2026-09-19 ein Zusammenlegen: drei Listen der Shell wurden
  // ueber die erklaerte Zuordnung (`represents`) zu einer gerechnet, und
  // `altIds` trug die alten Ids durch die Uebergangszeit. Beides ist weg —
  // die Shell FUEHRT jetzt eine Liste, also gibt es nichts mehr zu rechnen.
  //
  // `group` und `venue` bleiben aussen vor: das sind Shell-Begriffe
  // (Bodennaehe vs. Regie, steht im Raum), die kein Planer kennt. Sie duerfen
  // sie deshalb weder setzen noch verlieren — beim Rueckweg werden sie
  // erhalten.
  const geraete = project.geraete.map(
    ({ group, venue, ...rest }) => (void group, void venue, rest),
  )

  return {
    kind: SUITE_SEED_KIND,
    formatVersion: SUITE_SEED_VERSION,
    revision,
    ...(origin ? { origin } : {}),
    ...(autor ? { autor } : {}),
    ...(project.kommentare?.length ? { kommentare: project.kommentare } : {}),
    projectName: project.meta.name,
    venue: {
      name: project.meta.venue,
      widthM: project.hall.w,
      heightM: project.hall.h,
      stage: project.stage,
    },
    geraete,
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
    // Wahrheit).
    //
    // OHNE Ausnahmeliste: sie zaehlte frueher die Knoten heraus, die fuer
    // eine Kamera standen, damit das Lager nicht zwei Geraete anforderte, wo
    // eines steht. Mit einer Liste gibt es diese Doppelung nicht mehr — das
    // Problem ist nicht geloest, sondern verschwunden.
    bedarf: deriveBedarf({ geraete }),
    deckung: project.deckung ?? [],
    anschluesse: project.anschluesse ?? [],
    holds: project.seedHolds,
  }
}

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

  // ── Zurueck ins Shell-Modell ─────────────────────────────────────────────
  //
  // Gearbeitet wird auf dem GEMERGTEN Seed und nicht auf dem Patch: was die
  // Eigentumsregel abgelehnt hat, steht dort gar nicht erst drin, und diese
  // Funktion muss die Regel nicht ein zweites Mal kennen.
  //
  // Seit ADR-011 Stufe 2 ist das eine Zeile je Feldgruppe statt dreier
  // Ruecklisten. Was hier frueher stand und WEG ist:
  //
  //   * drei `map`s auf `cameras`/`fixtures`/`nodes`, jede mit ihrer eigenen
  //     Erhalten-Kette;
  //   * die Sonderregel, die aus der Signal-Meldung die Kameras und Leuchten
  //     heraushielt, damit sie nicht als Knoten zurueckkamen und beim
  //     naechsten Senden doppelt dastanden;
  //   * `represents`, das dabei erhalten werden musste.
  //
  // DIE REGEL, DIE BLEIBT: der Seed setzt, was er NENNT. Was er nicht nennt,
  // behaelt das vorhandene Geraet — `group` und `venue` sind Shell-Begriffe,
  // die kein Planer kennt, und ein Planer darf sie deshalb nicht verlieren.
  const alte = new Map(project.geraete.map((g) => [g.id, g]))
  const geraete: SuiteGeraet[] = seed.geraete.map((g) => {
    const alt = alte.get(g.id)
    return {
      ...g,
      group: alt?.group ?? 'floor',
      venue: alt?.venue ?? true,
      // Die Feldgruppen zusammenfuehren statt ersetzen: eine Meldung des
      // Kameraplans nennt `kamera` und schweigt zu `licht`. Wer sie ersetzte,
      // loeschte die DMX-Adresse einer Leuchte, sobald jemand im Kameraplan
      // etwas anfasste.
      ...(alt?.kamera || g.kamera ? { kamera: { ...alt?.kamera, ...g.kamera } } : {}),
      ...(alt?.licht || g.licht ? { licht: { ...alt?.licht, ...g.licht } } : {}),
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
    geraete,
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
  const zaehle = <T extends { id: string }>(vorherL: T[], nachherL: T[], p: string) => {
    const v = new Map(vorherL.map((x) => [x.id, JSON.stringify(x)]))
    const n = new Map(nachherL.map((x) => [x.id, JSON.stringify(x)]))
    const ids = { neu: [] as string[], geaendert: [] as string[], entfernt: [] as string[] }
    for (const [id, wert] of n) {
      if (!v.has(id)) ids.neu.push(p + id)
      else if (v.get(id) !== wert) ids.geaendert.push(p + id)
    }
    for (const id of v.keys()) if (!n.has(id)) ids.entfernt.push(p + id)
    return ids
  }
  // AUF DEM SEED GEZAEHLT UND NICHT AUF DEM SHELL-MODELL, und das ist kein
  // Detail: der erste Anlauf verglich `project.cameras` mit der neu gebauten
  // Liste und meldete fuer eine Meldung, die NICHTS aenderte, „2 geaendert".
  // Kein Wunder — die Rueckabbildung normalisiert (`?? ''`, `?? 0`), und zwei
  // Kameras hatten ein Feld, das im Seed gar nicht vorkommt. Gezaehlt gehoert,
  // was der Seed traegt: nur das faehrt zu den anderen Planern.
  //
  // UND SEIT ADR-011 STUFE 2 UEBER `geraete` STATT UEBER DIE DREI SICHTEN:
  // eine Kamera stand in `cameras` UND in `devices`, also zaehlte jede
  // Aenderung an ihr zweimal. „2 geaendert" bei einer geaenderten Kamera ist
  // keine Kleinigkeit — der Streifen ist die einzige Zahl, die der Nutzer
  // sieht, bevor er „Uebernehmen" drueckt.
  const a = zaehle(vorher.geraete, seed.geraete, 'g:')
  const d = zaehle(vorher.cables, seed.cables, 'c:')
  const meldung = {
    neu: [...a.neu, ...d.neu],
    geaendert: [...a.geaendert, ...d.geaendert],
    entfernt: [...a.entfernt, ...d.entfernt],
  }
  const offen = project.seedHandoffs ?? []
  const { liste, handoff } = meldungEinrechnen(offen, patch.domain, meldung, () => id(now() + 1000), now())

  return {
    project: liste === offen ? next : { ...next, seedHandoffs: liste },
    conflicts: befunde,
    handoff,
  }
}

/**
 * Eine Meldung in die offenen einrechnen — EINE offene Meldung je Planer.
 *
 * NUTZER-MELDUNG 2026-09-27: „die meldungen lassen sich nicht alle auf
 * einmal schliessen und zerstoeren die ui". Bis dahin legte JEDE Meldung
 * eines Planers eine eigene Zeile an; eine Stunde Arbeit im Kabel-Planer
 * ergab 15 Zeilen „1 geaendert", der Streifen wuchs ueber die Arbeitsflaeche,
 * und jede Zeile stellte dieselbe Frage. Die Frage IST aber eine je Planer:
 * „Uebernehmen" gibt den Stand DIESES Planers weiter, nicht eine einzelne
 * Aenderung.
 *
 * Gerechnet wird ueber die Ids, damit die Zahl stimmt: dieselbe Kamera
 * zweimal geaendert ist eine Aenderung; neu und wieder geloescht ist nichts;
 * neu und dann geaendert bleibt neu; geaendert und dann geloescht ist
 * geloescht. Heben sich alle Aenderungen auf, verschwindet die Meldung.
 *
 * Meldungen aus aelteren Projekten tragen keine Ids — dort werden die Zahlen
 * addiert. Das ueberzaehlt im Zweifel, verliert aber nichts.
 */
export function meldungEinrechnen(
  offen: SeedHandoffRecord[],
  domain: SeedHandoffRecord['domain'],
  meldung: { neu: string[]; geaendert: string[]; entfernt: string[] },
  neueId: () => string,
  jetzt: number,
): { liste: SeedHandoffRecord[]; handoff: SeedHandoffRecord | undefined } {
  const leer = meldung.neu.length + meldung.geaendert.length + meldung.entfernt.length === 0
  const alt = offen.filter((r) => r.domain === domain)
  if (leer) return { liste: offen, handoff: undefined }

  const neu = new Set<string>()
  const geaendert = new Set<string>()
  const entfernt = new Set<string>()
  let altZahlen = { neu: 0, geaendert: 0, entfernt: 0 }
  for (const r of alt) {
    if (r.ids) {
      r.ids.neu.forEach((x) => neu.add(x))
      r.ids.geaendert.forEach((x) => geaendert.add(x))
      r.ids.entfernt.forEach((x) => entfernt.add(x))
    } else {
      altZahlen = {
        neu: altZahlen.neu + r.zusammenfassung.neu,
        geaendert: altZahlen.geaendert + r.zusammenfassung.geaendert,
        entfernt: altZahlen.entfernt + r.zusammenfassung.entfernt,
      }
    }
  }
  for (const x of meldung.neu) {
    entfernt.delete(x)
    neu.add(x)
  }
  for (const x of meldung.geaendert) if (!neu.has(x)) geaendert.add(x)
  for (const x of meldung.entfernt) {
    if (neu.delete(x)) continue
    geaendert.delete(x)
    entfernt.add(x)
  }
  const ids = { neu: [...neu], geaendert: [...geaendert], entfernt: [...entfernt] }
  const zusammenfassung = {
    neu: ids.neu.length + altZahlen.neu,
    geaendert: ids.geaendert.length + altZahlen.geaendert,
    entfernt: ids.entfernt.length + altZahlen.entfernt,
  }
  const ohne = offen.filter((r) => r.domain !== domain)
  if (zusammenfassung.neu + zusammenfassung.geaendert + zusammenfassung.entfernt === 0) {
    return { liste: ohne, handoff: undefined }
  }
  const handoff: SeedHandoffRecord = { id: alt[0]?.id ?? neueId(), seenAt: jetzt, domain, zusammenfassung, ids }
  return { liste: [...ohne, handoff], handoff }
}

/**
 * Was ein Knopf im Uebergabe-Streifen tut — als reine Rechnung.
 *
 * ─── WARUM DAS HIER STEHT UND NICHT IN `App.tsx` ────────────────────────
 *
 * Weil es sonst niemand messen kann. Der Nachbartest (`seedWeitergabe`)
 * schreibt selbst, was ihm fehlt: „Das steckt in `App.tsx` an einem
 * `useCallback` und ist ohne gerendertes Fenster nicht erreichbar." Mit den
 * Sammelknoepfen (Nutzer-Meldung 2026-09-20) kommt genau dort die Regel
 * dazu, an der es schiefgehen kann — eine Uebergabe je MELDENDER Domaene —,
 * und eine ungemessene Regel in einem Ereignis-Handler ist eine Notiz.
 *
 * ─── DIE REGEL ──────────────────────────────────────────────────────────
 *
 * Drei Meldungen aus zwei Planern ergeben ZWEI Uebergaben, nicht drei und
 * nicht eine:
 *
 *   * nicht drei, weil zwei davon denselben Melder haben und der zweite
 *     Durchgang nichts Neues traegt;
 *   * nicht eine, weil der Seed genau EINE Herkunft traegt und der Melder
 *     daran seinen eigenen Hall erkennt. Eine Sammel-Uebergabe mit einer
 *     Herkunft naehme allen anderen Meldern diesen Schutz: sie bekaemen
 *     ihren eigenen Stand zurueck und ueberschrieben damit, was sie seither
 *     gearbeitet haben.
 *
 * Die Reihenfolge ist die der Meldungen. Sie ist fuer das Ergebnis egal —
 * jede Uebergabe traegt denselben Inhalt —, aber eine stabile Reihenfolge
 * laesst sich pruefen und eine zufaellige nicht.
 */
export function uebergabeAbschluss(
  alle: readonly SeedHandoffRecord[],
  ids: readonly string[],
): { rest: SeedHandoffRecord[]; domaenen: SeedDomain[] } {
  const gefragt = new Set(ids)
  const betroffen = alle.filter((r) => gefragt.has(r.id))
  const domaenen: SeedDomain[] = []
  for (const r of betroffen) if (!domaenen.includes(r.domain)) domaenen.push(r.domain)
  return { rest: alle.filter((r) => !gefragt.has(r.id)), domaenen }
}

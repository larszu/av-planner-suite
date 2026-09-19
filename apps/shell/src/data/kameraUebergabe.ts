// ───────────────────────────────────────────────────────────────────────────
// Eine Kamera, die im Signalplan entsteht, gehoert auch in den Kameraplan —
// aber nicht stillschweigend.
//
// ─── DER BEFUND, DER DAS NOETIG MACHT ──────────────────────────────────────
//
// `mergeSeedPatch` teilt die Domaenen-Listen je genau einem Eigentuemer zu:
// der Cable-Planer schreibt `devices` und `cables`, der MultiCam-Planer
// `cameras`. Wer im eingebetteten Cable-Planer eine Kamera anlegt, erzeugt
// deshalb einen SIGNALKNOTEN — und `apps/multicam-planner/.../shellSeedBridge`
// liest ausschliesslich `seed.cameras`. Die Kamera kam drueben nie an.
//
// Die Eigentumsregel deswegen aufzuweichen waere die falsche Reparatur. Sie
// ist der Grund, dass zwei Planer sich nicht gegenseitig ueberschreiben; eine
// Ausnahme fuer „aber Kameras schon" waere genau die Sorte Sonderfall, die
// spaeter niemand mehr erklaeren kann. Die Gewerks-Grenze gehoert der SHELL
// (B-18) — also entscheidet sie hier, und die Planer bleiben bei ihrem
// eigenen Id-Raum.
//
// ─── WARUM GEFRAGT WIRD UND NICHT UEBERNOMMEN ──────────────────────────────
//
// Derselbe Grund, aus dem es `SeedHandoffRecord` gibt: „wer im MultiCam eine
// Kamera versuchsweise dazustellt, um eine Sichtlinie zu pruefen, will sie
// nicht damit bestellt haben." Hier gilt es in der anderen Richtung. Im
// Signalplan steht auch die Kamera, die nur als QUELLE gebraucht wird — die
// Hallenkamera am Kabelweg, die im Bildplan nichts zu suchen hat. Sie
// ungefragt in den Kameraplan zu stellen waere „letzter gewinnt", die Regel,
// gegen die in dieser Suite schon der Konflikt-Streifen steht.
//
// ─── WAS HIER NICHT PASSIERT ───────────────────────────────────────────────
//
// KEINE POSITION WIRD GERATEN. Der Knoten traegt `nx`/`ny` — eine Stelle auf
// der Zeichenflaeche des Signalplans, zwischen 0 und 1. Mal Hallenbreite
// gerechnet ergaebe das eine Zahl in Metern, die aussaehe wie eine Vermessung
// und keine waere. Die uebernommene Kamera bekommt deshalb keine Position;
// der Kameraplan setzt beim Platzieren seine eigene Startstelle (dort
// ausdruecklich als „Anfangswert einer Platzierung und keine Aussage ueber
// diese Show" vermerkt) und meldet sie zurueck.
//
// KEIN NAME WIRD AUSGEWERTET. Ob ein Geraet eine Kamera ist, sagt
// `SignalNode.gewerk` — die Katalog-Aussage des fuehrenden Planers (ADR-002).
// Ohne sie gibt es keinen Vorschlag, auch wenn das Geraet „Kamera 1" heisst.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────
import type { Camera, SignalNode, SuiteProject } from './project'

/** Ein Geraet aus dem Signalplan, das im Kameraplan noch fehlt. */
export interface KameraVorschlag {
  /** Der Knoten im Signalplan, um den es geht. */
  nodeId: string
  /** Sein Name, fuer den Streifen. */
  name: string
  /**
   * Das Katalog-Modell, falls der Planer es genannt hat.
   *
   * Es entscheidet drueben ueber Gelingen oder Scheitern: der Kameraplan
   * loest daraus seinen Katalog-Eintrag auf und laesst eine Kamera aus, deren
   * Modell er nicht eindeutig trifft. Der Streifen nennt es deshalb mit,
   * statt den Nutzer erst drueben merken zu lassen, dass nichts ankam.
   */
  model?: string
}

/**
 * Die Id der Kamera, die aus diesem Knoten entstuende.
 *
 * ABGELEITET UND NICHT GEZOGEN: derselbe Knoten ergibt dieselbe Id. Eine
 * laufende Nummer haette bei zweimaliger Uebernahme — nach einem Undo, nach
 * einem erneuten Laden — zwei Kameras fuer dasselbe Blech erzeugt, und
 * niemand haette gesehen, welche die echte ist.
 */
export const kameraIdFuer = (nodeId: string): string => `cam_${nodeId}`

/** Steht dieser Knoten laut Katalog fuer eine Kamera? */
const istKameraKnoten = (n: SignalNode): boolean => n.gewerk === 'camera'

/**
 * Was der Shell zur Uebernahme vorliegt.
 *
 * Drei Gruende, warum ein Kamera-Knoten NICHT vorgeschlagen wird, und jeder
 * ist eine Aussage:
 *
 *   `represents` gesetzt — die Zuordnung steht schon, es gibt nichts zu
 *   entscheiden.
 *
 *   abgelehnt — der Nutzer hat entschieden, und eine Entscheidung wird nicht
 *   alle paar Sekunden neu erfragt.
 *
 *   die Kamera existiert bereits unter der abgeleiteten Id — der Fall tritt
 *   nach einem Undo im Shell-Projekt auf, bei dem `represents` zurueckfiel,
 *   die Kamera aber stehenblieb. Ein zweiter Vorschlag legte sie ein zweites
 *   Mal an; stattdessen wird die Zuordnung hier stillschweigend als gegeben
 *   behandelt, weil sie es ist.
 *
 * Feste Reihenfolge: die des Signalplans. Derselbe Baum ergibt denselben
 * Streifen (ADR-004).
 */
export function kameraVorschlaege(project: SuiteProject): KameraVorschlag[] {
  const abgelehnt = new Set(project.kameraUebergabeAbgelehnt ?? [])
  const kameraIds = new Set(project.cameras.map((c) => c.id))
  return project.nodes
    .filter(
      (n) =>
        istKameraKnoten(n) &&
        !n.represents &&
        !abgelehnt.has(n.id) &&
        !kameraIds.has(kameraIdFuer(n.id)),
    )
    .map((n) => ({
      nodeId: n.id,
      name: n.name,
      ...(n.model ? { model: n.model } : {}),
    }))
}

/**
 * Den Vorschlag annehmen: die Kamera entsteht, und die Zuordnung wird
 * erklaert.
 *
 * BEIDES ZUSAMMEN und nicht nacheinander. Eine Kamera ohne `represents` waere
 * genau der Zustand, den B-18 beschreibt: der Sprung zwischen den Modulen
 * zeigte ins Leere, und der Bedarf zaehlte Knoten und Kamera als zwei
 * Geraete. Wer nur die Kamera anlegte, haette das Doppelzaehlen eingebaut,
 * das `deriveBedarf` eigens vermeidet.
 *
 * `model` kommt aus dem Knoten, falls der Planer eines genannt hat; die
 * uebrigen Kamera-Felder bleiben leer beziehungsweise null. Das sind die
 * Angaben des KAMERAPLANS (Objektiv, Brennweite, Bildwinkel) — sie hier zu
 * setzen hiesse, sie zu erfinden, und der Kameraplan haette sie beim ersten
 * Melden ohnehin ueberschrieben.
 */
export function uebernimmKamera(project: SuiteProject, nodeId: string): SuiteProject {
  const knoten = project.nodes.find((n) => n.id === nodeId)
  if (!knoten || !istKameraKnoten(knoten) || knoten.represents) return project

  const id = kameraIdFuer(nodeId)
  if (project.cameras.some((c) => c.id === id)) return project

  const kamera: Camera = {
    id,
    name: knoten.name,
    // Das Modell und nicht `sub`: der Kameraplan loest seinen Katalog danach
    // auf. Hat der Planer keines genannt (Geraet ohne Katalog-Zuordnung),
    // bleibt es leer — und die Kamera kommt drueben als „Modell nicht
    // eindeutig" gemeldet an, statt still zu verschwinden.
    model: knoten.model ?? '',
    lens: '',
    focalMm: 0,
    hfovDeg: 0,
    // `linked: false` ist hier die wahre Aussage und kein Vorgabewert: die
    // Kamera ist eben erst entstanden und im Kameraplan noch nicht verkabelt.
    linked: false,
  }

  return {
    ...project,
    cameras: [...project.cameras, kamera],
    nodes: project.nodes.map((n) =>
      n.id === nodeId ? { ...n, represents: { kind: 'camera' as const, id } } : n,
    ),
    meta: { ...project.meta, saved: false },
  }
}

/**
 * Den Vorschlag ablehnen.
 *
 * Der Knoten bleibt, wie er ist — abgelehnt wird die UEBERNAHME, nicht die
 * Katalog-Aussage. `gewerk` stehenzulassen ist wichtig: kaeme der Nutzer
 * spaeter auf die andere Entscheidung, muesste er sonst das Geraet neu
 * anlegen, damit die Aussage zurueckkehrt.
 */
export function lehneKameraAb(project: SuiteProject, nodeId: string): SuiteProject {
  const bisher = project.kameraUebergabeAbgelehnt ?? []
  if (bisher.includes(nodeId)) return project
  return { ...project, kameraUebergabeAbgelehnt: [...bisher, nodeId] }
}

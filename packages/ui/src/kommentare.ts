// ───────────────────────────────────────────────────────────────────────────
// KOMMENTARE — an einem Ding, nicht in einem Werkzeug.
//
// ─── DER AUFTRAG ──────────────────────────────────────────────────────────
//
// Nutzer, 2026-09-20: „Baue alles was du begründet nicht gebaut hast auch
// fertig und behebe alle Gründe global sodass es planner-übergreifend
// funktioniert."
//
// Der Grund, aus dem es keine Kommentare gab, war der fehlende Urheber. Den
// gibt es jetzt (`identitaet.ts`). Der zweite Teil des Auftrags —
// „planner-übergreifend" — entscheidet die FORM, und zwar gegen die
// naheliegende:
//
// ─── WARUM DER KOMMENTAR AM OBJEKT HÄNGT UND NICHT AN DER KARTE ───────────
//
// Die naheliegende Lösung wäre ein Feld `kommentare` an der Board-Karte. Sie
// wäre in zwanzig Minuten gebaut und falsch: dieselbe Kamera ist im
// MultiCam-Planer eine Position, im Kabel-Planer ein Gerät mit Ports und im
// Lager ein Artikel. Ein Kommentar an der Karte wäre ein Kommentar an EINER
// dieser drei Ansichten, und die anderen beiden wüssten nichts davon — genau
// die Lage, gegen die ADR-011 („ein universelles Gerät") geschrieben ist.
//
// Deshalb: ein Kommentar trägt die ID DES OBJEKTS, über das gesprochen wird.
// Die Sammlung liegt im Projekt und fährt über den Seed zu jedem Planer.
// „Der Ton an Kamera 3 brummt", im Kabel-Planer geschrieben, steht danach im
// MultiCam an derselben Kamera.
//
// ─── WAS EIN KOMMENTAR NICHT IST ──────────────────────────────────────────
//
// Keine Aufgabe (die haben To-dos, samt Zuständigem), kein Änderungs-Eintrag
// (der entsteht aus dem Dokument), keine Notiz (die steht auf der Fläche und
// gehört niemandem). Ein Kommentar ist die Äusserung EINER Person über EIN
// Ding, mit Zeitpunkt.
//
// REIN: keine Speicherung, kein Netz, keine Uhr. `jetzt` und `id` kommen von
// aussen, damit die Rechnung prüfbar bleibt — dieselbe Trennung wie im
// Seed-Patch.
// ───────────────────────────────────────────────────────────────────────────
import { identitaetOk, vollstaendig, type Identitaet } from './identitaet'

export interface Kommentar {
  id: string
  /**
   * Worüber gesprochen wird: die Id eines Geräts, einer Board-Karte, eines
   * Anschlusspunkts. Welche Art von Ding es ist, steht NICHT hier — die Id
   * ist in der Suite eindeutig, und ein zusätzlicher Typ wäre eine zweite
   * Angabe, die mit der ersten in Streit geraten kann.
   */
  objektId: string
  /** Wer es gesagt hat. Vollständig, damit der Name bleibt, wenn die Person geht. */
  autor: Required<Identitaet>
  /** Unix-Millisekunden. */
  zeit: number
  text: string
  /**
   * Erledigt — vom Leser gesetzt, nicht vom Schreiber.
   *
   * Ein erledigter Kommentar wird NICHT gelöscht: „ist behoben" ist eine
   * Aussage über eine Äusserung, und wer sie wegwirft, nimmt dem nächsten
   * Leser die Möglichkeit nachzusehen, was damals besprochen war.
   */
  erledigt?: boolean
  /**
   * Antwort auf einen anderen Kommentar — dessen Id.
   *
   * Eine Ebene, nicht mehr: ein Faden mit Unterfäden ist auf einer
   * Zeichenfläche nicht mehr zu lesen, und die Frage „worauf antwortet das"
   * beantwortet sich bei zwei Ebenen von selbst.
   */
  antwortAuf?: string
}

/** Was eine Äusserung braucht, bevor sie eine wird. */
export type KommentarErgebnis =
  | { ok: true; kommentar: Kommentar }
  | { ok: false; grund: 'kein-autor' | 'leer' }

/**
 * Einen Kommentar schreiben.
 *
 * Zwei Absagen, und beide sind Aussagen und keine Fehler:
 *
 *   `kein-autor`  niemand hat gesagt, wer er ist. Dann entsteht kein
 *                 Kommentar — „unbekannt" darunterzuschreiben wäre genau die
 *                 Erfindung, wegen der es die Kommentare vorher nicht gab.
 *   `leer`        nichts gesagt. Ein leerer Kommentar ist kein Kommentar.
 */
export function schreibeKommentar(input: {
  objektId: string
  text: string
  autor: Identitaet | undefined
  jetzt: number
  id: string
  antwortAuf?: string
}): KommentarErgebnis {
  if (!identitaetOk(input.autor)) return { ok: false, grund: 'kein-autor' }
  const text = input.text.trim()
  if (!text) return { ok: false, grund: 'leer' }
  return {
    ok: true,
    kommentar: {
      id: input.id,
      objektId: input.objektId,
      autor: vollstaendig(input.autor),
      zeit: input.jetzt,
      text,
      ...(input.antwortAuf ? { antwortAuf: input.antwortAuf } : {}),
    },
  }
}

/**
 * Die Kommentare zu einem Ding, älteste zuerst, Antworten unter ihrem Bezug.
 *
 * Die Reihenfolge ist die des GESPRÄCHS und nicht die der Datei: wer eine
 * Antwort auf den ersten Kommentar schreibt, nachdem drei weitere dastehen,
 * findet sie beim ersten wieder und nicht am Ende.
 */
export function fadenFuer(alle: readonly Kommentar[], objektId: string): Kommentar[] {
  const eigene = alle.filter((k) => k.objektId === objektId)
  const wurzeln = eigene.filter((k) => !k.antwortAuf).sort((a, b) => a.zeit - b.zeit)
  const out: Kommentar[] = []
  for (const w of wurzeln) {
    out.push(w)
    out.push(...eigene.filter((k) => k.antwortAuf === w.id).sort((a, b) => a.zeit - b.zeit))
  }
  // Antworten auf etwas, das es nicht (mehr) gibt, fallen nicht unter den
  // Tisch: sie stehen am Ende. Ein verschwundener Kommentar darf keine
  // Aeusserung mitnehmen, die jemand geschrieben hat.
  const gesehen = new Set(out.map((k) => k.id))
  out.push(...eigene.filter((k) => !gesehen.has(k.id)).sort((a, b) => a.zeit - b.zeit))
  return out
}

/** Wie viele offene Kommentare hängen an diesem Ding? */
export const offeneKommentare = (alle: readonly Kommentar[], objektId: string): number =>
  alle.filter((k) => k.objektId === objektId && !k.erledigt).length

/**
 * Die Objekte, an denen etwas Offenes hängt — je Id die Zahl.
 *
 * Eine Fläche fragt das EINMAL je Durchlauf und nicht je Karte: bei 200
 * Karten und 500 Kommentaren wäre die Frage je Karte eine Schleife über
 * alles, also 100.000 Vergleiche für eine Zahl am Kartenrand.
 */
export function offeneJeObjekt(alle: readonly Kommentar[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const k of alle) {
    if (k.erledigt) continue
    m.set(k.objektId, (m.get(k.objektId) ?? 0) + 1)
  }
  return m
}

/**
 * Zwei Kommentar-Sammlungen zusammenführen — für den Weg über den Seed.
 *
 * Eine Äusserung wird NIE überschrieben: sie ist ein Ereignis, kein Feld.
 * Bei gleicher Id gewinnt deshalb nicht „der letzte", sondern der Stand mit
 * dem ERLEDIGT-Haken — abhaken ist die einzige Änderung, die ein Kommentar
 * kennt, und sie geht nur in eine Richtung.
 *
 * Das macht die Zusammenführung ordnungsunabhängig: derselbe Satz Meldungen
 * in anderer Reihenfolge ergibt dasselbe Ergebnis. Ohne diese Eigenschaft
 * hinge das Ergebnis daran, welcher Planer zuerst gemeldet hat.
 */
export function fuehreKommentareZusammen(
  a: readonly Kommentar[],
  b: readonly Kommentar[],
): Kommentar[] {
  const jeId = new Map<string, Kommentar>()
  for (const k of [...a, ...b]) {
    const da = jeId.get(k.id)
    if (!da) {
      jeId.set(k.id, k)
      continue
    }
    jeId.set(k.id, da.erledigt || k.erledigt ? { ...da, erledigt: true } : da)
  }
  return [...jeId.values()].sort((x, y) => x.zeit - y.zeit)
}

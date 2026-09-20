// ───────────────────────────────────────────────────────────────────────────
// EINE DATEI HERAUSGEBEN. Gemessen 2026-09-20, Chromium: der Film-Export
// landete als Datei namens `download` — ohne Namen, ohne Endung.
//
// Der Grund sind zwei Dinge, die an vier Stellen der Suite gleich falsch
// standen und an einer (`downloadProject`) schon richtig:
//
//   1. DER ANKER MUSS IM DOKUMENT STEHEN. Ein `document.createElement('a')`,
//      der nie eingehängt wird, führt den Klick aus — aber sein
//      `download`-Attribut wird nicht in jedem Fall beachtet. Heraus kommt
//      der Vorgabename des Browsers, und der Empfänger bekommt eine Datei,
//      die sein System nicht zuordnen kann.
//
//   2. `revokeObjectURL` DARF NICHT IM SELBEN SCHRITT FOLGEN. Der Klick
//      STARTET die Übertragung, er beendet sie nicht. Wer die Adresse
//      unmittelbar danach zurückgibt, zieht sie dem Vorgang unter den
//      Füssen weg — bei kleinen Dateien fällt das nie auf, bei einem Film
//      von 40 MB schon.
//
// Deshalb gibt es diese eine Stelle, und deshalb steht sie im Paket und
// nicht in der Hülle: die Planner geben dieselben Dateien heraus, und ein
// Export, der in einem Werkzeug einen Namen trägt und im anderen nicht,
// ist derselbe Fehler zweimal.
// ───────────────────────────────────────────────────────────────────────────

/** Wie lange die Objekt-Adresse gültig bleibt, nachdem der Klick sie startete. */
const FREIGABE_MS = 60_000

/**
 * Eine Datei zum Herunterladen anbieten.
 *
 * `name` wird übernommen wie er kommt — die ENDUNG gehört zum Namen und
 * sagt, was wirklich in der Datei liegt. Ein `.mp4`, in dem WebM steckt,
 * ist eine Datei, die der Empfänger nicht öffnen kann; wer das Format erst
 * beim Aufnehmen erfährt, baut den Namen erst danach.
 */
export function herunterladen(inhalt: Blob, name: string): void {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(inhalt)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Nicht sofort: der Klick startet die Übertragung, er beendet sie nicht.
  setTimeout(() => URL.revokeObjectURL(url), FREIGABE_MS)
}

/**
 * Einen Dateinamen aus einem Titel bauen.
 *
 * Ohne Endung — die hängt der Aufrufer an, weil nur er weiss, was in der
 * Datei liegt.
 *
 * DER NAME WIRD AUF ASCII GEBRACHT, und das ist der zweite Befund vom
 * 2026-09-20: ein Board heisst „Sommershow 2026 — Board", und der
 * Gedankenstrich darin liess Chromium den Namen fallen — die Datei kam als
 * `download` heraus, ohne Endung. Umlaute werden deshalb umgeschrieben
 * (ä → ae), alles übrige Nicht-ASCII fällt weg, und was bleibt, ist ein
 * Name, den auch ein Windows-Rechner und ein Mail-Anhang unverändert
 * weiterreichen.
 *
 * Umgeschrieben und nicht abgeschnitten: ein Board „Grüne Halle" hiesse
 * sonst `grne-halle`, und das findet niemand wieder.
 */
const UMSCHRIFT: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', å: 'aa', æ: 'ae', ø: 'oe',
  á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u', ñ: 'n', ç: 'c',
}

export function dateiName(titel: string): string {
  const sauber = titel
    .toLowerCase()
    .replace(/[äöüßåæøáàâãéèêëíìîïóòôõúùûñç]/g, (z) => UMSCHRIFT[z] ?? z)
    // Alles, was kein ASCII-Buchstabe, keine Ziffer und kein Strich ist,
    // wird ein Leerzeichen — Pfadtrenner, Gedankenstriche, Schriftzeichen
    // anderer Alphabete gleichermassen.
    .replace(/[^a-z0-9._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    // Ein führender Punkt machte die Datei auf Unix unsichtbar.
    .replace(/^[.-]+/, '')
  // Leer bleibt nicht leer: ein Download ohne Namen ist genau der Fehler,
  // den diese Datei behebt.
  return sauber || 'export'
}

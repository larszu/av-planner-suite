// Läuft AUF der besuchten Seite und liest nur, was sie selbst über sich sagt.
//
// Open Graph vor dem Fenstertitel: `og:title` ist die Angabe FÜR eine
// Vorschau, `<title>` die für den Fensterrahmen — „Sommershow 2026" gegen
// „Sommershow 2026 | Nordlicht Media".
//
// NICHTS WIRD ERFUNDEN. Fehlt ein Titel, fehlt er; der erste Absatz ist
// keine Beschreibung, und ein Ersatztitel aus der Adresse sähe aus wie eine
// Angabe der Seite.
;(() => {
  const meta = (auswahl) => document.head.querySelector(auswahl)?.content?.trim() || undefined
  const auswahl = String(window.getSelection?.() ?? '').trim() || undefined
  return {
    url: location.href,
    titel:
      meta('meta[property="og:title"]') ||
      meta('meta[name="twitter:title"]') ||
      document.title.trim() ||
      undefined,
    beschreibung:
      meta('meta[property="og:description"]') ||
      meta('meta[name="twitter:description"]') ||
      meta('meta[name="description"]') ||
      undefined,
    bildUrl: meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || undefined,
    // Was jemand MARKIERT hat, ist die stärkste Angabe darüber, worum es ihm
    // geht — stärker als jedes `og:`-Feld. Sie wird deshalb mitgeschickt und
    // nicht gegen die Beschreibung aufgerechnet.
    auswahl,
  }
})()

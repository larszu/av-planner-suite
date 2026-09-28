# ADR-015 — Ein Paket erreicht jeden Planer als geprüfte Kopie

**Status:** angenommen, gebaut am 2026-09-28 (erstes Paket: `@avplan/floorplan`)
**Betrifft:** alle eigenständigen Planer-Repos und `packages/*`
**Baut auf:** ADR-006 (Werkzeug-Schnitt), ADR-007 (Oberflächen-Regeln)

## Der Auftrag

Eigentümer, 2026-09-28:

> „Mache alles, was ähnlich ist, als gemeinsame Pakete und cherry-picke jeweils die besten
> Funktionen."

Anlass war ein Fehler im Gebäude-Planer: ein Grundriss-Bild ließ sich nicht per Drag & Drop
hinzufügen. Der Nachsatz: „Alles davon gibt es in Teilen ja schon im cable-planner."

## Der Befund (gemessen, 2026-09-28)

Vier Bestandsaufnahmen über alle Repos, festgehalten in
[`docs/gemeinsame-pakete.md`](../gemeinsame-pakete.md). Die Kernaussage:

1. **Kein eigenständiger Planer hängt an einem `@avplan/*`-Paket.** Kein `package.json` nennt
   eines, keine Quelldatei importiert eines. Die Pakete wirken nur in den vendorierten Kopien unter
   `apps/`. Was die Suite teilt, erreicht den Planer, den jemand herunterlädt, nicht.
2. **Deshalb wuchsen Parallelfassungen.** Drei `venueExchange.ts`, vier Plan-Lader, fünf
   `types.ts` des Inventarformats mit fünf verschiedenen Prüfsummen — deren Kommentare sich
   „byte-gleich" nennen. Geprüft werden überall nur Schlüssellisten, nie Bytes.
3. **Das einzige Muster, das trägt,** ist der Client der Gerätebibliothek: eine Quelle
   (`av-device-library/clients/`), zeichengleiche Kopien in sechs Repos. Ihm fehlte nur die
   Prüfung über die Repo-Grenze.

## Die Entscheidung

**Die Quelle eines gemeinsamen Moduls ist `av-planner-suite/packages/<name>/src`.** Jeder Planer,
der es nutzt, trägt eine **zeichengleiche Kopie** in einem festen Ordner `…/avplan/<name>/` mit
einem `MANIFEST.json` (SHA-256 je Datei).

- **Verteilen:** `npm run pakete:verteilen` (`scripts/pakete-verteilen.mjs`) kopiert jedes Paket
  in die Planer, die in `ZIELE` stehen, und schreibt das Manifest. Eine Zeile je Kopie, sonst
  nirgends.
- **Prüfen im Planer:** jeder Planer hat einen Wächter, der die Kopie gegen ihr Manifest
  rechnet. Eine Änderung in der Kopie wird dort rot, mit dem Satz, wohin sie gehört.
- **Prüfen in der Suite:** `npm run pakete:pruefen` vergleicht die Kopien mit dem Paket (braucht
  die Planer-Repos als Geschwister, wie `drift`).
- **In der Suite selbst** ersetzt das Paket die Kopie. `planner-drift.mjs` behandelt jeden Pfad
  unter `avplan/` als `expected-overlay`, nicht als Drift.

### Warum Kopie und nicht Abhängigkeit

- Die Pakete sind `private`, ohne Registry. Eine Git-Abhängigkeit auf einen Unterordner kann npm
  nicht.
- Jeder Planer muss allein bauen, allein testen und allein veröffentlichen (Pages, Release) —
  ohne Zugriff auf ein zweites Repo im CI. Eine Kopie mit Manifest leistet das; eine
  Workspace-Abhängigkeit nicht.
- Es ist das Muster, das beim Geräte-Client seit Wochen hält.

### Was ein Paket sein darf

- **Keine Stores und keine Oberfläche eines einzelnen Planers.** Reine Rechnung, Formate, und
  rahmenlose Browser-Helfer (Handler, die jeder Planer an sein eigenes Element hängt).
- **Keine Pflicht-Abhängigkeit, die nicht jeder Planer ohnehin hat.** Schweres (pdf.js) wird
  hereingereicht, nicht importiert — `@avplan/floorplan` nimmt einen `PdfSeitenRenderer`.
- **ADR-006 gilt unverändert.** Ein Paket teilt Code zwischen Werkzeugen; es verschiebt keine
  Zuständigkeit. Das Lager bleibt ein eigenes Werkzeug, der Gebäude-Planer auch.

## Folgen

- Jede Übernahme eines Pakets in einen Planer ist ein eigener PR in dem Planer, mit grünem CI
  (ADR-006: ein Schritt nach dem anderen).
- Eine Änderung an gemeinsamem Code beginnt in der Suite. Die Kopien nachzuziehen ist ein
  Skriptlauf, kein Abgleich von Hand.
- Die Reihenfolge der Pakete steht in [`docs/gemeinsame-pakete.md`](../gemeinsame-pakete.md).

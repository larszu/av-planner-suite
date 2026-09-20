# Dokumentation — Übersicht

Inhaltsverzeichnis für `docs/`. Diese Seite existiert, weil am 2026-09-04
gemessen wurde, dass **keines** der 67 Dokumente in diesem Ordner von einer
Einstiegsseite aus verlinkt war — auch nicht die beiden Dokumente, auf denen die
gesamte laufende Arbeit steht, und auch nicht die fünf ADRs. Der Rechercheteil
hatte mit [`research/README.md`](research/README.md) sogar ein sehr gutes eigenes
Inhaltsverzeichnis; es verlinkte nur niemand.

`npm run docs:reachable` hält das jetzt fest und läuft in CI.

## Laufende Arbeit

| Dokument | Was es ist |
| --- | --- |
| [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) | Was in den zehn Repos tatsächlich läuft — nach Ausführung belegt, nicht nach Plan. Enthält die Ausführungs-Nachweise (Exit-Codes echter Läufe) und den Stand je Bereich. |
| [`BLOCKIERT.md`](BLOCKIERT.md) | Die Restliste: jedes der 31 offenen Issues aller zehn Repos, was daran nicht am Programmieren scheitert, die **eine** Sache, die es löst, und der Prompt, der danach genügt. |
| [`IMPLEMENTATION_BACKLOG.md`](IMPLEMENTATION_BACKLOG.md) | Die offenen Punkte mit Befund, Begründung und Aufwand — plus der Abschnitt „Nicht zu entscheiden ohne den Eigentümer". |

## Die Schnittstellen

| Dokument | Was es ist |
| --- | --- |
| [`SCHNITTSTELLEN.md`](SCHNITTSTELLEN.md) | Wo Daten die Werkzeuggrenze überqueren: die sieben Dateiformate, der laufende `suite-seed`-Austausch, die erklärten Verknüpfungen und die Fremdsysteme — und der Abschnitt „Was es NICHT gibt", gemessen statt vermutet. |

## Architektur-Entscheidungen (ADR)

Jede ADR hält eine Entscheidung samt Befund fest, der sie ausgelöst hat.

- [`ADR-001 — Identitäts-Rückgrat`](decisions/ADR-001-identity-spine.md)
- [`ADR-002 — Geräte-Identität zwischen Plan und Lager`](decisions/ADR-002-device-identity-plan-and-stock.md)
- [`ADR-003 — Bestätigter Zustand`](decisions/ADR-003-confirmed-state.md)
- [`ADR-004 — Dokument-Stempel`](decisions/ADR-004-document-stamp.md)
- [`ADR-005 — Verlustfrei oder laut`](decisions/ADR-005-lossless-or-loud.md)
- [`ADR-006 — Der Schnitt: was Kern bleibt und was ein eigenes Werkzeug wird`](decisions/ADR-006-werkzeug-schnitt.md)
- [`ADR-007 — Die Oberflaechen-Regeln der Suite`](decisions/ADR-007-oberflaechen-regeln.md)
- [`ADR-008 — Die B4-Objektivsteuerung gehört in die Camera Bridge`](decisions/ADR-008-b4-objektivsteuerung-ablage.md)
- [`ADR-009 — Die B4-Firmware läuft unter ESP-IDF`](decisions/ADR-009-b4-runtime-esp-idf.md)
- [`ADR-010 — Die Ladeplanung ist ein Modul des Lagers`](decisions/ADR-010-ladeplanung-im-lager.md)
- [`ADR-011 — Ein universelles Gerät, nicht eines je Planer`](decisions/ADR-011-universelles-geraet.md)
- [`ADR-012 — Eine Basis für alle Listen`](decisions/ADR-012-eine-basis-fuer-alle-listen.md)
- [`ADR-013 — Verlustfrei durch alle Planer`](decisions/ADR-013-verlustfrei-durch-alle-planer.md)
- [`ADR-014 — Ein selbst angelegtes Gerät ist ein Gerät`](decisions/ADR-014-selbst-angelegte-geraete.md)
- [`Was von den ADRs steht — und was sich widerspricht`](adr-stand.md) — gemessener
  Umsetzungsstand aller elf ADRs und die sechs Widersprüche (2026-09-19)

## Markt- und Nutzer-Recherche

Der Korpus hat ein eigenes, ausführliches Inhaltsverzeichnis:

**→ [`research/README.md`](research/README.md)** — rund 21.000 Zeilen über 16
Marktsegmente, 11 Berufe, die Produktionskette und die acht bestehenden Repos.
Einstieg über [`research/METHOD.md`](research/METHOD.md): dort stehen die
Quellen-Rubrik, die Häufigkeitsstufen jeder Aussage und — wichtig — welche
Quellen in der Umgebung *nicht* erreichbar waren.

Die Repo-Bestandsaufnahme innerhalb des Korpus ist auch für die Entwicklung
relevant:

- [`research/repos/INVENTORY.md`](research/repos/INVENTORY.md) — was die acht
  Repos können, aus dem Quelltext gelesen statt aus den READMEs.
- [`research/repos/DRIFT-REPORT.md`](research/repos/DRIFT-REPORT.md) — die
  gemessene Divergenz zwischen den vendorierten `apps/`-Kopien und den
  Einzel-Repos. **Erzeugt mit `npm run drift:report`**; die maßgeblichen Zahlen
  stehen in `scripts/planner-drift-baseline.json`.
- [`research/repos/CONSOLIDATION-PLAN.md`](research/repos/CONSOLIDATION-PLAN.md)
  — der Stufenplan, mit dem die Divergenz abgebaut wurde.
- [`research/repos/MULTICAM-I18N-ORPHANS.md`](research/repos/MULTICAM-I18N-ORPHANS.md)
  — verwaiste Übersetzungsschlüssel in `multicam-planner`.

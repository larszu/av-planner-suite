# ADR-003: Bestätigter Zustand statt gesendeter Befehl

Status: entschieden · Datum: 2026-08-30 · Betrifft: Roadmap-Initiative 10 aus
[`FEATURE-STRATEGY.md`](../research/synthesis/FEATURE-STRATEGY.md), Score 23.

## Das Problem

Die Pain-Point-Recherche fand fünf Marktsegmente, die unabhängig voneinander dasselbe verlangen:
**den echten Gerätezustand lesen, nicht den zuletzt gesendeten Befehl anzeigen.** Kamera-Panels
driften open-loop, Intercom-Tasten lügen darüber, ob ein Mikro offen ist, Media-Server lassen sich
nicht zurücklesen, Show-Control-Schichten feuern nur Trigger. Das Rollen-Dossier des Bildtechnikers
formuliert die Regel von der anderen Seite: *never display a value the system has not confirmed.*

Es ist dieselbe Regel wie die Provenienz in ADR-001 und „ein Vorschlag ist keine Deckung" in
ADR-002 — nur an der Laufzeit statt am Plan.

## Der Befund im eigenen Code

Vor dem Entscheiden wurde nachgesehen, statt anzunehmen. Das Ergebnis ist differenzierter als der
Marktbefund, und das ist der Grund, warum dieser Abschnitt vor der Entscheidung steht: **Ein
pauschales „unsere Integrationen sind open-loop" wäre schlicht falsch gewesen.**

| Stelle | Befund |
| --- | --- |
| `VideohubExportDialog.handleReadState` | **Verstoß, behoben.** Der Status-Read schrieb den gelesenen Hub-Zustand in dieselbe Variable wie das geplante Routing — und seit ADR-001 wird die persistiert. Ein Klick auf „Status lesen" ersetzte damit die Planungsabsicht still durch die Beobachtung und speicherte sie. Behoben in `cable-planner#610`. |
| `AtemDialog.pushAll` | **Erfüllt die Regel bereits.** Nach `bulkSetInputNames` wird `getState()` gelesen und angezeigt. Was in der Tabelle steht, kommt vom Gerät. |
| `RentmanCableExportDialog.sendBucket` | **Offener Verstoß.** Nach erfolgreichem Senden wird `lastSyncedQty: bucket.built` gespeichert — der lokal gezählte Wert, nicht der von Rentman bestätigte. Der Name liest sich als *bestätigt*, der Inhalt ist *gesendet*. Und die nächste Differenz rechnet mit ihm: Weicht Rentman ab, ist jede folgende Menge falsch, still und kumulativ. |
| `exportGreengo` / `.gg5` | **Grenze, kein Verstoß.** Ein Datei-Export hat keinen Rückkanal; es gibt nichts zu bestätigen. Das gehört benannt, damit niemand es später für eine Lücke hält. |
| `checkState` / Mobile-Rückkanal | **Das gute Muster.** Der Aufbau-Status kommt vom Feld zurück ins Projekt — eine echte Bestätigung, keine Wiederholung des Befehls. |

## Die Entscheidung

**Jeder Wert, den eine Oberfläche als Gerätezustand zeigt, trägt seine Herkunft — oder er wird
nicht als Zustand gezeigt.** Drei Herkünfte, dieselben wie im `.avsourcemap`:

- `planned` — im Plan festgelegt, nie an ein Gerät gegangen.
- `commanded` — gesendet, Empfang nicht geprüft.
- `confirmed` — vom Gerät zurückgelesen.

Daraus folgen drei Regeln, die jede für sich prüfbar sind:

1. **Beobachtung und Absicht teilen sich niemals eine Variable.** Ein Status-Read darf den Plan
   nicht verändern. Die Differenz wird gezeigt; das Übernehmen ist eine Entscheidung. (So jetzt im
   Videohub-Dialog.)
2. **Ein Feldname darf nicht mehr behaupten, als der Inhalt hergibt.** `lastSyncedQty` ist keine
   Bestätigung, solange niemand zurückgelesen hat. Entweder zurücklesen oder ehrlich benennen.
3. **Wo es keinen Rückkanal gibt, wird das gesagt statt verschwiegen.** Ein `.gg5`-Export ist eine
   Übergabe, keine Steuerung — und die Oberfläche darf danach nicht so tun, als wüsste sie, was das
   Pult tut.

## Warum nicht „überall zurücklesen"

Naheliegend, aber falsch. Ein Rücklesen kostet einen zusätzlichen Aufruf, und bei Rentman wäre das
ein zweiter API-Call pro Position — bei einem Kabel-Export mit dreißig Zeilen also dreißig
zusätzliche Anfragen gegen ein Rate-Limit, für eine Bestätigung, die in aller Regel nur wiederholt,
was ohnehin geschah. Die Regel verlangt nicht Rücklesen, sondern **Ehrlichkeit über das, was man
weiß.** Ein als `commanded` gekennzeichneter Wert ist vollkommen brauchbar; ein als `confirmed`
ausgegebener Wert, der es nicht ist, ist der Schaden.

## Die Reihenfolge

| # | Inkrement | Warum hier |
| --- | --- | --- |
| 0 | Videohub-Status-Read entkoppeln | War ein aktiver Datenverlust — erledigt in `cable-planner#610` |
| 1 | Rentman-Sync-Menge ehrlich benennen und in der Oberfläche als *gesendet* ausweisen | Kleinster offener Verstoß, betrifft eine Zahl, die weiterrechnet |
| 2 | Provenienz-Anzeige als geteiltes UI-Element | Erst wenn zwei Stellen sie brauchen, lohnt die Verallgemeinerung |
| 3 | `sony-camera-bridge`: `BridgeTallyState` gegen die Regel prüfen | Anderes Repo, eigener Rhythmus |

Inkrement 2 bewusst nicht zuerst: Ein gemeinsames Provenienz-Badge zu bauen, bevor der zweite
Anwendungsfall existiert, wäre eine Abstraktion auf Verdacht.

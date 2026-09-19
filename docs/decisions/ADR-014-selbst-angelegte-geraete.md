# ADR-014 — Ein selbst angelegtes Gerät ist ein Gerät

**Status:** angenommen, gebaut am 2026-09-19
**Betrifft:** multicam-, light- und cable-planner, `@avplan/ui`
**Baut auf:** ADR-002 (nie raten), ADR-012 (eine Basis), ADR-013 (verlustfrei durch alle Planer)

## Der Auftrag

Eigentümer, 2026-09-19:

> „Ich muss aber auch selber Geräte anlegen können und dann in anderen Planern öffnen können."

## Der Befund

Zwei Fälle, beide gemessen.

### 1. Ein selbst angelegtes Modell verschwand beim nächsten Seed

Der MultiCam-Planer hat seit jeher `customCameras` und `customLenses` — man kann sich ein Modell
anlegen. Der Rückweg suchte es aber nur im **festen** Katalog:

```ts
const camDef = CAMERAS.find((c) => c.id === v.cameraId)   // findet ein eigenes Modell nie
```

Die Meldung ging deshalb **ohne `model`** hinaus. Das Gerät stand danach modellos im geteilten
Projekt, und beim nächsten Seed fiel es hier als „im Katalog nicht eindeutig" heraus. Wer sich
eine Kamera selbst anlegte, verlor sie beim nächsten Projektwechsel — kein Seiteneffekt, sondern
der Normalfall.

### 2. Ein von Hand angelegtes Gerät kam im Fachplaner nie an

Ein Gerät, im Signalplan angelegt und der Kategorie „Cameras" zugeordnet, erreicht den Seed
korrekt. Der Kameraplan **verwarf** es: kein Katalogtreffer, also `ausgelassen` — und die Brücke
schrieb dafür eine Zeile in die Konsole. In der Oberfläche stand nichts. Aus Sicht des Nutzers war
sein Gerät einfach nicht da.

## Die Entscheidung

**1. Ein selbst angelegtes Modell fährt mit.** Kennt der gemeinsame Katalog das Modell nicht, geht
es als `eigenesModell` (bzw. `eigenesObjektiv`) im Fach dieses Planers mit — dieselbe Regel, die
ADR-013 schon für den selbst angelegten Scheinwerfer im Licht-Planer trifft. Ein Modell **aus** dem
Katalog fährt nicht mit; das wäre die zweite Wahrheit für 377 Modelle.

**2. Was nicht platziert werden kann, wird gezeigt — nicht verschwiegen.** `ausgelassen` trägt
jetzt das **Gerät** und nicht nur einen Grund, beide Planer führen die Liste in ihrem Zustand, und
beide zeigen sie: „Im Projekt, hier ohne Modell."

**3. Geraten wird weiterhin nichts.** Ohne Sensorbreite gibt es keinen Bildwinkel, ohne
Photometrie keine Lichtrechnung — und eine gerechnete Zahl sähe völlig richtig aus (ADR-002). Das
Gerät steht da, es sagt was ihm fehlt, und wer es weiß, trägt es ein. Das ist dieselbe Form, die
der Cable-Planer mit `portsUnknown` seit langem hat: das Gerät ist im Plan, sein unbekannter Teil
ist markiert.

**4. Der Grund unterscheidet zwei Lagen.** „Kein Modell angegeben" ist etwas anderes als „Modell
„X" ist im Katalog nicht eindeutig". Wer den ersten liest, muss etwas eintragen; wer den zweiten
liest, muss suchen. Vorher stand für beides derselbe Satz da — mit dem Instanznamen als
vermeintlichem Modell.

## Was das nicht ist

Kein Platzhalter auf dem Plan. Eine Kamera ohne Sensor ließe sich zeichnen, aber nicht rechnen,
und ein Kegel, der aus erfundenen Zahlen entsteht, ist schlimmer als kein Kegel. Der Lichtplaner
sagt dazu schon länger das Richtige: ein Plan, dessen Zahlen auf fehlenden Angaben beruhen, ist
**nicht beurteilbar** — und das ist etwas anderes als in Ordnung (`preflight.ts`).

## Der letzte Schritt: dem Gerät ein Modell geben (nachgetragen 2026-09-19)

Zeigen allein reicht nicht. Die Liste hat deshalb je Eintrag ein **Auswahlfeld**: Modell wählen,
und das Gerät wird platziert.

Ein Auswahlfeld und **kein Vorschlag, den man bestätigt** — ein Vorschlag wäre geraten, und genau
das verbietet ADR-002. Wer das Gerät angelegt hat, weiß, was es ist.

Platziert wird **das Gerät**, nicht eine neue Kamera: es behält seine Id, seinen Namen und seine
Lage. Eine neue Id wäre ein zweiter Datensatz für dasselbe Blech — die Doppelung, gegen die
ADR-011 geschrieben ist, und der Bedarf zählte danach zwei Geräte statt einem. Der Rückweg meldet
die Zuordnung dann von selbst (`typId` aus dem gewählten Modell, ADR-012), und damit ist das Gerät
in **jedem** Planer eines mit Modell.

Wo das Gerät keine Lage hat, gilt die Vorgabe des jeweiligen Planers: im Kameraplan die Mitte des
Raums — er kennt die Hallenmaße, und `0/0` wäre die Ecke, als Tatsache gezeichnet. Im Lichtplan
dieselbe Stelle wie in `seedToFixtures`, denn der kennt keine Raumgröße (er hat einen Grundriss,
kein Rechteck), und eine ausgedachte Mitte wäre eine Zahl aus dem Nichts.

## Gemessen

* `apps/multicam-planner/src/__tests__/eigenesGeraet.test.ts` — ein selbst angelegtes Modell
  meldet seinen Namen, fährt im Fach mit und kommt nach dem Umweg **ohne die eigene Bibliothek**
  zurück; dasselbe für ein selbst angelegtes Objektiv. Und: ein Modell aus dem Katalog fährt nicht
  mit.
* `apps/shell/test/eigenesGeraetDurchgereicht.test.ts` — ein von Hand im Signalplan angelegtes
  Gerät kommt mit seiner Kategorie an und wird von beiden Fachplanern **gemeldet** statt
  fallengelassen, mit Gerät und unterscheidbarem Grund.
* `apps/multicam-planner/src/__tests__/modellZuordnen.test.ts` — die Zuordnung platziert **das
  Gerät** (seine Id, sein Name, seine Lage), meldet `typId` zurück, tut nichts bei unbekannter Id
  oder unbekanntem Modell, und erfindet keine Lage, wo das Gerät keine hat.

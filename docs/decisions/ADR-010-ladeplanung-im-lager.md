# ADR-010: Die Ladeplanung ist ein Modul des Lagers und kein eigenes Werkzeug

Status: entschieden · Datum: 2026-09-18 · Betrifft: `inventory-planner`, den Zuschnitt aus
ADR-006 und die Grenze zum Plan aus ADR-001

## Die Frage

Ein Ladeplaner — Cases in einen Laderaum setzen, prüfen, ob es passt, einen Ladeplan und eine
Abladereihenfolge ausgeben — ist ein für sich stehendes Werkzeug. Es gibt ihn als Produkt
(Truck Packer, EasyCargo, Packvol). Gehört er in ein eigenes Repo, wie `light-planner` und
`multicam-planner` eigene Repos sind?

## Die Entscheidung

**Nein. Die Ladeplanung wird ein Modul des `inventory-planner`.**

## Warum — gemessen am Kriterium aus ADR-006

ADR-006 macht ein eigenes Werkzeug an vier Bedingungen fest. Die Ladeplanung erfüllt **keine
davon vollständig**:

1. **Eigene Stammdaten, die den Plan überdauern?** Teilweise: Fahrzeuge sind welche. Aber das,
   womit gerechnet wird — Außenmaße, Leergewicht, Stapelbarkeit —, **gehört dem Lager**.
   `InventoryCase` trägt die Maße, `StorageNode` mit `CONTAINER_KINDS = ['case', 'transportCase']`
   trägt den LPN-Baum samt Verschachtelung, `packList.ts` und `containerCheckout.ts` liegen
   daneben. Ein eigenes Repo führte die Case-Maße ein zweites Mal ein. Das ist die zweite
   Wahrheit aus ADR-001, und sie driftete lautlos: niemand merkt, dass ein Case im Ladeplaner
   noch 800 mm tief ist und im Lager längst 820.
2. **Andere Rollen?** Nein. Wer packt, ist derselbe, der ausgibt — in einem kleinen Haus
   dieselbe Person, in einem großen dieselbe Abteilung.
3. **Ohne die Bestandsdaten vollständig?** Nein, und hier liegt der eigentliche Punkt (unten).
4. **Verbindung auf wenige benannte Fragen reduzierbar?** Nein. Der Ladeplaner fragt den Bestand
   nicht nach fünf Dingen; er arbeitet die ganze Zeit auf ihm.

## Der Vorsprung, und er folgt aus derselben Entscheidung

Ein Ladeplaner, der bei einer **Tabelle** anfängt, weiß, dass Case 7 1200 × 800 × 900 mm misst
und 64 kg wiegt. Mehr nicht.

Hier zeigt `CasePackedItem.itemId` auf echten Bestand. Daraus fällt etwas heraus, das kein
Tabellen-Import kann:

> „Case 7 fehlt" heißt hier automatisch **„die Ersatz-Funkstrecke fehlt auch"**.

Das ist kein Zusatz, sondern der Grund für die Ablage. Ein eigenes Repo müsste den Bestand
importieren, um dieselbe Auskunft zu geben — und hätte ihn dann zweimal.

## Was das Modul TUT

* Cases und Container in einen definierten Laderaum setzen, in 3D sichtbar
* Prüfen, ob es passt: Geometrie, Stapelregeln, Nutzlast, Achslast
* Einen druckbaren Ladeplan, eine Abladereihenfolge und eine Dock-Checkliste ausgeben

## Was es NICHT tut — die Grenzen, und jede mit ihrem Grund

* **Kein Plan-Modell.** Kein `EquipmentItem`, kein `CablePlannerProject`, keine eigene
  Bedarfsrechnung. Die neuen Typen heißen `Vehicle`, `LoadPlan`, `Placement`, `Ladung` und
  fallen nicht unter den Wächter. `scripts/plan-grenze-check.ts` misst das weiter, und dass er
  grün bleibt, ist Teil der Abnahme dieses Moduls — nicht ein Nebeneffekt.
* **Keine Disposition, keine Tourenplanung, keine Fahrerzuordnung.** Das Fahrzeug ist hier ein
  **Laderaum mit Achsen**, kein Betriebsmittel mit Kalender. Es hat Maße, Nutzlast und
  Achsabstände — keinen Belegungsplan, keinen Fahrer, keine Kosten je Kilometer. Kommt
  Disposition, wird sie nach demselben Kriterium ein eigenes Werkzeug (eigene Stammdaten:
  Verfügbarkeit und Fahrer; andere Rolle: Disponent; ohne den Laderaum vollständig) und liest
  diese Fahrzeug-Stammdaten.
* **Keine Ladungssicherungs-Freigabe.** Das Modul rechnet und zeigt; es erteilt keine
  Unbedenklichkeitsbescheinigung. Eine Achslast, die es ausrechnet, ist eine Rechnung aus den
  eingetragenen Zahlen — und die Zahlen stammen vom Fahrzeugschein, nicht von einer Waage. Wo
  Angaben fehlen, steht das da; eine gerechnete Zahl aus geschätzten Fahrzeugdaten sähe auf dem
  Ausdruck aus wie eine Messung.

## Die Kette

Dieses ADR ist die Klammer über `inventory#16`. Reihenfolge der Arbeit:
Transport-Eigenschaften → Fahrzeug-Modell → Stammdaten → Packer-Kern → Raster-Regime →
Ladereihenfolge → 3D-Ansicht → Achslast → Ausgabe → Import → Nachfragetest.

## Folgen

* Die Ladeplanung wächst im `inventory-planner`, nicht daneben. Der Abschnitt „Ladeplanung" in
  dessen README ist die Bedien-Doku; eine Abschrift dieses ADR gehört nicht dorthin (ADR-001).
* `grenze:check` bleibt der Wächter der Grenze zum Plan und wird durch die neuen Typen nicht
  weicher gemacht. Wer hier ein Plan-Modell braucht, hat die Grenze an der falschen Stelle
  gezogen — nicht den Wächter zu streng.
* Wenn die Ladeplanung eines Tages die vier Bedingungen aus ADR-006 doch erfüllt (eigene
  Rolle, eigene Stammdaten, ohne den Bestand vollständig), wird sie ein eigenes Werkzeug. Dann
  steht das hier als Nachtrag, mit Datum und Messung — nicht als stiller Umzug.

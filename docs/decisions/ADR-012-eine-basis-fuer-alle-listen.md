# ADR-012 — Eine Basis für alle Listen

**Status:** angenommen, gebaut am 2026-09-19
**Betrifft:** `@avplan/device-catalog`, `@avplan/ui` (`SeedGeraet`), cable-, multicam-, light- und inventory-planner
**Baut auf:** ADR-001 (eine Identität), ADR-002 (Gerätetyp besitzt das Datenblatt), ADR-011 (ein universelles Gerät)

## Der Auftrag

Eigentümer, 2026-09-19:

> „Inventory planner und der ganze Rest hat aber noch eigene Listen. Ausnahmslos alles soll sich
> die gleiche Basis teilen!"

## Der Befund

ADR-011 hat aus drei **Geräte**listen eine gemacht. Ein Gerät hat seither genau eine Id, und die
Kategorie ordnet es mehreren Plänen zugleich zu.

Eine Ebene tiefer galt das nicht. Der **Typ** eines Geräts stand als freier Text in `model`, und
jeder Planer löste ihn gegen seine eigene Liste auf:

| Wer | Liste | Auflösung |
|---|---|---|
| cable-planner | 19 Katalogdateien, 467 Einträge | `deviceTypeId` (GUID) — der einzige, der eine Identität führte |
| multicam-planner | `data/cameras.ts`, 377 · `data/lenses.ts`, 835 | Namensvergleich gegen `manufacturer + model` |
| light-planner | `core/fixtureLibrary.ts`, 84 | Namensvergleich gegen `manufacturer + name` |
| inventory-planner | **keine** | `model.toLowerCase()` gegen den Artikelnamen |
| Bedarf (`deriveBedarf`) | — | `model.toLowerCase()` als Lagerschlüssel |

Vier Auflösungen für dieselbe Frage, und jede eine andere Antwort. „Sony FX9" gegen
„Sony PXW-FX9" entschied, ob eine Kamera im Kameraplan ankam — und ob das Haus ein Blech oder
zwei bestellte.

Das ist derselbe Namensvergleich, den ADR-002 im ersten Satz verbietet. Er war nicht übersehen
worden: es gab schlicht nichts Besseres, weil die gemeinsame Identität nirgends im Gerät stand.

## Die Entscheidung

**1. Das Gerät kennt seinen Typ.** `SeedGeraet.typId` trägt die Katalog-Identität aus
`@avplan/device-catalog`. Sie fährt durch den Seed wie `model`, gehört dem führenden Plan und
darf von jedem gesetzt werden, der sie kennt — geleert von keinem.

**2. Der Katalog kennt die Ids seiner Quellen.** `Geraetetyp.refs` bildet Quellenname auf die Id
ab, unter der jene Quelle den Typ führt (`{ multicam: 'sony-fx9' }`). Damit findet ein Planer
seinen eigenen Eintrag zu einer Katalog-Id, ohne Namen zu vergleichen — die Rückrichtung, die
bisher fehlte. Gerechnet vom Generator, nicht von Hand gepflegt: ein Feld in 1751 Einträgen
driftet.

**3. Auflösen heisst: Id zuerst, Name zuletzt.** `katalogTemplate` (cable), `katalogKamera`
(multicam) und `katalogFixture` (light) fragen zuerst die `typId`. Der Namensvergleich bleibt
darunter für Geräte, die aus keinem Katalog stammen — er ist die schlechtere Auskunft und steht
deshalb hinten, nicht statt dessen.

**4. Der Bedarf schlüsselt über die Identität.** `deriveBedarf` nimmt `typId` als Schlüssel, wo
es eine gibt, und setzt `deviceTypeId` an der Zeile. Das Lager traf schon immer zuerst über
`deviceTypeId` — es bekam die Angabe nur nie.

**5. Objektive sind Geräte.** Die 835 Objektive stehen als Kategorie `Lenses` im Katalog. Ein
Objektiv hat Hersteller, Modell, Datenblatt, Case und Tagesmiete; dass nur der Kameraplan damit
rechnet, macht es nicht zu etwas anderem.

**6. Das Lager bekommt den Katalog über einen ANSCHLUSS.** `lib/typKatalog.ts` ist ein Port mit
leerer Vorgabe; die Suite meldet den Katalog an (`typKatalogSuite.ts`). Grund ist der
Zwei-Fassungen-Betrieb: als eigene App liegt `@avplan/device-catalog` nicht daneben, und ein
fester Import machte sie unbaubar — dieselbe Lage, aus der `connectShellSeed` ein Overlay ist.
Ohne angemeldete Quelle ist die Vorschlagsliste leer, und das ist die ehrliche Aussage.

## Was NICHT geteilt wird

Die fachlichen Fakten. Sensor und Bajonett bleiben im Kameraplan, Photometrie und Abstrahlwinkel
im Lichtplan, Ports und Steckertypen im Signalplan. Ein Paket, das sie führte, müsste
`ConnectorType`, `SignalStandard` und den halben Kabelgraph mitziehen — und wäre dann kein
Katalog mehr, sondern der Cable-Planer mit anderem Namen (ADR-002, Eigentumstabelle).

Geteilt wird die **Identität**. Wer einen fremden Typ wählt, bekommt ihn samt der Auskunft, dass
die Fachdaten fehlen (`ohneOptik`, `ohnePhotometrie`, `portsUnknown`) — statt dass das Modell
verschwiegen wird.

## Was der Umbau sichtbar gemacht hat

* **Eine Kategorie gab es zweimal.** `Sync/Reference` und `Sync/Referenz` standen nebeneinander:
  zwei Katalogdateien schrieben die englische Fassung, eine dritte war beim Sprachwechsel (#822)
  übersehen worden. Solange die Kategorie eine Überschrift war, war das hässlich; seit ADR-011
  ordnet sie ein Gerät den **Plänen** zu — zwei Schreibweisen sind zwei Zuordnungen, und die eine
  trifft keine Regel. `packages/device-catalog/test/kategorien.test.ts` hält es fest.

## Der Rest, der keiner ist

**facility-planner hat keine Geräteliste** und braucht keine. Er beschreibt das Haus:
Anschlusspunkte, Stromkreise, benannte Klinken der Haussteuerung. Seine Aufzählungen (`Bauform`,
`RcdTyp`, `Netzform`) sind Normbegriffe und kein Katalog — „CEE 63" ist ein Name und kein Modell.
Ihn in den Katalog zu ziehen hiesse, die Grenze aus ADR-006 in der Gegenrichtung zu brechen.

Das gehört hierher, weil „ausnahmslos alles" eine Prüfung jeder Liste verlangt — auch derer, die
danach unverändert bleibt. Ungeprüft stehenlassen und begründet stehenlassen sehen im Diff gleich
aus und sind es nicht.

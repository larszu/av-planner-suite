# ADR-013 — Verlustfrei durch alle Planer

**Status:** angenommen, gebaut am 2026-09-19
**Betrifft:** `@avplan/ui` (`SeedGeraet`, `mergeSeedPatch`), cable-, multicam- und light-planner, Shell
**Baut auf:** ADR-005 (verlustfrei oder laut), ADR-011 (ein universelles Gerät), ADR-012 (eine Basis für alle Listen)

## Der Auftrag

Eigentümer, 2026-09-19, auf den Satz „die Fachdaten bleiben bei dem Planer, der sie versteht":

> „Sie müssen aber in allen Planern bleiben. Damit ich sie von a nach b nach c und wieder nach a
> kopieren kann und nichts verloren geht."

Der Einwand trifft. „Gehört dem Planer, der sie versteht" ist eine Aussage über **Zuständigkeit**;
sie darf nicht zu einer Aussage über **Verfügbarkeit** werden. Wer etwas nicht versteht, hat es zu
tragen — nicht wegzuwerfen.

## Der Befund

Gemessen am selben Tag. Eine Kamera, im Kameraplan ausgerichtet (Schwenk 15°, Neigung −8°, Höhe
2,4 m, Blende 5.6, Fokus 12 m, Farbe), kam aus `camerasToSeedPatch` mit **drei** Feldern zurück:

```
{ id, name, kategorie, model, typId, x, y, kamera: { lens, focalMm, hfovDeg } }
```

Schwenk, Neigung, Höhe, Blende, Fokus, Farbe, Rig, Sensormodus, Extender — weg. Dasselbe im
Lichtplan (Ausrichtung, Körperdrehung, Zoomwinkel, Folien, Torblenden, Fokus-Notiz) und im
Signalplan (**die Anschlüsse**, Rack-Einbau, Panel-Bilder, Fremdschlüssel aus Rentman/NetBox).

**Warum es niemandem auffiel:** jeder Planer hält seinen eigenen Stand daneben und legt ihn beim
nächsten Seed wieder darüber (`vorhandene`). Solange das Projekt in einer Sitzung bleibt, sieht
alles richtig aus. Über die **Datei** — in A speichern, in B öffnen, in C bearbeiten, in A wieder
aufmachen — war die Arbeit weg. Genau der Weg aus dem Auftrag.

Für die *ganzen Domänen-Slots* der `.avplan`-Datei gibt es diese Zusage seit ADR-005 (`avForeign`,
`unknownDomains`). Für das **einzelne Gerät** gab es sie nicht.

## Die Entscheidung

**`SeedGeraet.fachdaten`** — ein Fach je Gewerk (`'cameras'`, `'fixtures'`, `'signal'`, …).

1. **Jeder schreibt sein eigenes Fach vollständig.** Alles, was nur er versteht, geht hinein.
2. **Niemand liest ein fremdes Fach.** Der Inhalt ist für alle außer dem Eigentümer undurchsichtig
   — er wird nicht interpretiert, nicht gerechnet, nicht aufgeräumt.
3. **Niemand verliert ein fremdes Fach.** `mergeSeedPatch` ersetzt das Fach des Melders und trägt
   alle übrigen.
4. **Ersetzen, nicht mischen** — beim eigenen Fach. Nur der Eigentümer weiß, was ein fehlendes
   Feld darin bedeutet; ein Mischen ließe einen gelöschten Wert wiederauferstehen.
5. **„Nichts gesagt" ist keine Löschung.** Eine Meldung ohne Fach nimmt das vorhandene nicht weg.

### Keine zweite Wahrheit

Was das Protokoll führt, gehört **nicht** ins Fach. Jeder Planer hat dafür eine Ausschlussliste
(`GETEILT`), und ein Test prüft sie gegen den Rückweg.

Die Lage ist der Fall, bei dem man es übersieht: im Signalplan sind `x`/`y` Bildpunkte auf der
Zeichenfläche, das Protokoll trägt `nx`/`ny` (0..1). Dieselbe Angabe in zwei Einheiten an zwei
Stellen — und beim nächsten Umbau widersprechen sie sich.

### Die eine Ausnahme, und warum sie dazugehört

Ein **selbst angelegter Scheinwerfer** steht in keinem Katalog. Sein Modell ist dann nur im Feld
`fixture` vorhanden, und ohne dieses Feld käme er nach einem Umweg als „Modell nicht eindeutig"
zurück — also gar nicht. Es fährt deshalb **genau dann** mit, wenn der Katalog ihn nicht kennt:
nicht immer (das wäre die zweite Wahrheit für 84 Modelle) und nicht nie (das wäre der Verlust).

### Wer gewinnt, wenn beide etwas wissen

Der **lokale Stand schlägt das Fach**: wer das Gerät gerade in der Hand hat, ist neuer als die
Datei. Das Fach greift dort, wo es keinen lokalen Stand gibt — und das ist genau der Fall aus dem
Auftrag.

Im Signalplan schlägt das **Fach den Katalog**: ein Port, den jemand umbenannt oder zusätzlich
angelegt hat, ist eine Aussage über *dieses Gerät*; das Datenblatt ist eine über seinen *Typ*. Die
Aussage über das einzelne Gerät ist die neuere. Ein Gerät ohne Fach — also eines, das hier noch
nie durchlief — bekommt seine Anschlüsse weiter aus dem Katalog.

## Was das kostet

Die Projektdatei wird größer: ein Mischer mit 40 Anschlüssen trägt sie jetzt auch im geteilten
Projekt. Das ist der Preis, und er ist der richtige — dieselben Daten lagen vorher schon in der
Projektdatei des Cable-Planers, nur eben *nur* dort.

## Gemessen

* `packages/ui/test/fachdaten.test.ts` — die Regel selbst, einschließlich a→b→c→a auf der
  Protokollebene.
* `apps/shell/test/rundlaufDreiPlaner.test.ts` — **der Satz des Eigentümers als Lauf**: ein Gerät,
  drei Planer, jedes Mal über die Shell *und über die Datei*. Gegenprobe gefahren: nimmt man einer
  Brücke ihr Fach weg, steht die Kamera wieder auf −90° und zeigt auf ihre eigenen Füße.
* Je Planer ein Rundlauf **ohne lokalen Stand** (`fachdatenRundlauf.test.ts`), denn nur dort zeigt
  sich der Verlust.

# Was blockiert ist — und was genau es löst

*Stand 2026-09-19. Gegengezählt gegen die offenen Issues aller zehn Repos.*

## Wofür dieser Zettel da ist

Jede Zeile hier ist Arbeit, die **nicht am Programmieren scheitert**, sondern an
einer Sache, die in dieser Arbeitsumgebung nicht zu beschaffen ist: ein
Datenblatt hinter einem Netzfilter, eine Optik auf dem Tisch, eine gemietete
VM, eine Zahl aus einem Nachfragetest, ein reales Projekt zum Nachsehen.

Für jede steht hier **die eine Sache**, die sie löst, und der Auftrag, der
danach genügt. Wer eine Zeile erfüllen kann, kopiert die Spalte „Ein Prompt"
und bekommt ein fertiges Ergebnis — die Form dahinter ist jeweils schon gebaut
und getestet.

**Was NICHT hier steht:** alles, was ohne diese Beschaffung baubar war. Das ist
gebaut. Dieser Zettel ist die Restliste, nicht die Arbeitsliste.

## Warum die Form zuerst gebaut wurde und der Inhalt fehlt

Das sieht von außen verkehrt aus — leere Tabellen, ein Katalog ohne die
Einträge, ein Achs-Zustandsautomat ohne Achse. Der Grund steht in jeder
CLAUDE.md dieser Repos:

> **Nichts erfinden.** Fehlt eine Angabe, fehlt sie — keine Vorgabe, die wie
> eine Messung aussieht.

Eine geratene Nutzlast steht danach auf einem Lastverteilungsplan, und bei der
Kontrolle wiegt die Waage. Eine geratene Portzahl steht im Plan, als hätte der
Hersteller sie genannt. Eine geratene Gruppenadresse steht als **Freigabe** im
Haus. Deshalb: Form fertig, Prüfung scharf, Inhalt leer — und zwar sichtbar
leer.

---

## 1 · Netz: die Datenblätter sind aus dieser Umgebung nicht erreichbar

Am 2026-09-19 nachgemessen, nicht vermutet: `blackmagicdesign.com`, `aja.com`,
`decimator.com`, `novastar.tech`, `brompton.tech`, `mercedes-benz.de` und
`de.wikipedia.org` antworten am Egress-Proxy mit **403 (policy denial)** bzw.
`EGRESS_BLOCKED`.

| Issue | Form steht | Es fehlt | Ein Prompt |
|---|---|---|---|
| [cable-planner#878](https://github.com/larszu/cable-planner/issues/878) | Einreichformat mit Pflicht-Quellenlink, Prüfung vor Aufnahme, `katalog-luecken.md` mit gemessenen Ständen, `katalogLuecken.test.ts` | Datenblatt-PDFs oder ‑URLs: **LED-Prozessoren** (Novastar, Brompton, Megapixel — der Bereich steht bei null), **Decimator** (MD-HX, MD-LX, DMON), **Intercom** neben GreenGo (Riedel, Clear-Com), ein zweiter Kamerahersteller | „Hier sind die Datenblätter für *…*. Trag die Geräte in den Katalog ein, jedes mit `datenblattUrl`, und zieh die Zahlen in `docs/katalog-luecken.md` und `katalogLuecken.test.ts` nach." |
| [inventory-planner#19](https://github.com/larszu/inventory-planner/issues/19) | `KatalogFahrzeug` mit **Pflichtfeld** `quelle`, `katalogMaengel()`, Ausmessen-Hilfe, Ableiten/Überschreiben, Im-/Export | Datenblätter oder Zulassungsbescheinigungen für Sprinter / Ducato / Jumper / Boxer / Transit / Crafter in den gängigen Radstand- und Höhenvarianten | „Hier sind die Fahrzeug-Datenblätter. Leg den Startsatz in `src/domain/data/` an, jedes Fahrzeug mit `quelle`; fehlende Maße bleiben `undefined`." |
| [sony-camera-bridge#54](https://github.com/larszu/sony-camera-bridge/issues/54) | Encoder + UDP-Sender, 20 Tests, `docs/b4/freed-output.md` | die FreeD-Byte-Tabelle aus der Vizrt-Protokollbeschreibung oder einem Sony-free-d-Handbuch (BRC-X1000, ILME-FR7) — oder ein `tcpdump` echter Ausrüstung | „Hier ist ein echtes FreeD-D1-Paket / die Byte-Tabelle. Schreib einen byte-genauen Test dagegen und bestätige oder korrigiere `POSITION_UNITS_PER_MM`." |

**Lieber keine als fünf erfundene.** Ein Eintrag ohne Datenblatt ist kein halber
Fortschritt: `catalogueEvidence` zählt ihn als unbelegt, die Beleg-Abdeckung
sinkt, und die Zahl steht trotzdem im Plan.

---

## 2 · Hardware: es muss etwas auf dem Tisch liegen

Die B4-Arbeit ist in Phasen geschnitten, und die Phasen sind nicht
Bequemlichkeit: **Phase 5 ergibt ein anschlussfähiges Gerät ohne eine einzige
bewegte Achse**, Phase 6 kommt danach.

| Issue | Form steht | Es fehlt |
|---|---|---|
| [#38](https://github.com/larszu/sony-camera-bridge/issues/38) Optiktyp je Optik bestimmen | Gruppen A/B/C in `b4-lens-control.md` | die Optiken selbst |
| [#39](https://github.com/larszu/sony-camera-bridge/issues/39)–[#41](https://github.com/larszu/sony-camera-bridge/issues/41) Iris-Platine, Regelkreis, Sicherheitsreview | Werkstattanleitung (`iris-anleitung.pdf`), Beschaltung dimensioniert (`wiring.md`), Kalibriertabelle als Code | DAC/ADC-Aufbau, eine Optik, ein Oszilloskop |
| [#42](https://github.com/larszu/sony-camera-bridge/issues/42)–[#45](https://github.com/larszu/sony-camera-bridge/issues/45) Breakout, UART-Mitschnitt, Abnahme Objektivname | Frame-Decoder mit CRC, Mitschnitt-Vergleich (`B4CaptureDiff`) | aufgetrenntes 12-Pin-Kabel, Pegelwandler, eine Optik |
| [#47](https://github.com/larszu/sony-camera-bridge/issues/47), [#48](https://github.com/larszu/sony-camera-bridge/issues/48) Kommandocode-Widerspruch, Sendepfad | beide Codetabellen dokumentiert, Encoder vorhanden | Mitlesen an einer echten Kamera; TX bleibt hinter Compile-Flag **und** Jumper |
| [#49](https://github.com/larszu/sony-camera-bridge/issues/49)–[#52](https://github.com/larszu/sony-camera-bridge/issues/52) Demand als Quelle | SPC-7000-Belegung transkribiert, WebSocket-Bus und HID-Fläche vorhanden | ein Demand (Zoom-Wippe / Fokus-Rad) |
| [#35](https://github.com/larszu/sony-camera-bridge/issues/35) Lens-Backend am Command-Bus | untere Haelfte gebaut (`protocol/B4Lens.ts`: Framing, CRC, Objektivname, Blendenzahl), `b4-lens` als Verbindungsart, Abnahmekriterien unstrittig | **haengt an #47**, nicht an Zeit: ein Backend auf eine geratene Kommandocode-Lesart zu setzen hiesse, sie als implementiert auszugeben — an genau der Stelle, an der ein bestaetigter Wert von einem kommandierten unterschieden wird |
| [#37](https://github.com/larszu/sony-camera-bridge/issues/37) SPC-7000 als zweite Quelle | Transkription samt Abweichungsanalyse | **Pin 6 (`Detect`) an einem echten B/C-Demand nachmessen** |
| [#55](https://github.com/larszu/sony-camera-bridge/issues/55) Zoom/Fokus auf 0–4095 | Kalibriertabelle, Monotonie geprüft, „ohne Tabelle kein Wert" | eine Optik, über den vollen mechanischen Weg gefahren |
| [#56](https://github.com/larszu/sony-camera-bridge/issues/56) Interop gegen Unreal Live Link | Encoder + Sender | ein Rechner mit Unreal und Live Link |
| [#57](https://github.com/larszu/sony-camera-bridge/issues/57), [#59](https://github.com/larszu/sony-camera-bridge/issues/59) Achsabstraktion, erste Achse | **Zustandsautomat vollständig**, 19 Tests, jeder Abschaltpfad einzeln | ein Motor. Ob eine Bremse in der Zeit löst, die ihr Profil angibt, zeigt nur die echte Achse |

Eine Ausnahme in dieser Gruppe, die keine Hardware braucht, sondern einen
Anlass: [#53](https://github.com/larszu/sony-camera-bridge/issues/53) haelt
fest, dass **OSC bewusst zurueckgestellt** ist — `stagecue` existiert nicht,
OSC kommt im ganzen Konto nirgends vor, und WebSocket und HID erreichen alles,
was es gibt. Das Issue oeffnet, wenn ein konkreter Abnehmer benannt ist, der
OSC spricht und die beiden vorhandenen Wege nicht nutzen kann. Ein Prompt:
„Abnehmer *…* braucht OSC, erwarteter Adressraum *…*. Bau den Ausgang in der
Bridge."

**Ein Prompt, wenn die Hardware da ist:** „Ich habe *…* angeschlossen. Hier ist
der Mitschnitt / das Messprotokoll. Werte es gegen `docs/b4/…` aus, markiere
jede Abweichung, und leg das Protokoll unter `docs/b4/measurements/` ab — auch
wenn eine Messung misslungen ist."

Die letzte Hälfte des Satzes steht mit Absicht da: das Abnahmekriterium von #37
verlangt das Protokoll ausdrücklich auch für die missglückte Messung.

---

## 3 · Betrieb: VM, Recht, und eine Zahl, die noch niemand gemessen hat

Diese Kette hängt an einer Entscheidung des Eigentümers und nicht an Code. Die
Reihenfolge steht in [`cable-planner/docs/cloud/nachfragetest.md`](https://github.com/larszu/cable-planner/blob/main/docs/cloud/nachfragetest.md)
und [`recht-und-betrieb.md`](https://github.com/larszu/cable-planner/blob/main/docs/cloud/recht-und-betrieb.md):
**erst die Zahl, dann die Miete.**

| Issue | Hängt an | Ein Prompt |
|---|---|---|
| [cable-planner#868](https://github.com/larszu/cable-planner/issues/868) eigene VM | die Zahl aus dem Nachfragetest | „Der Nachfragetest hat *…* ergeben. Setz die VM auf, wie in `docs/cloud/` beschrieben." |
| [#869](https://github.com/larszu/cable-planner/issues/869) Signaling + TURN | #868 | die Anleitung steht fertig in `docs/self-hosted-relay.md` |
| [#870](https://github.com/larszu/cable-planner/issues/870) gehosteter Lese-Link | #868, AVV | |
| [#871](https://github.com/larszu/cable-planner/issues/871) Cloud-Sync mit Revisionen | #868, AVV | |
| [#874](https://github.com/larszu/cable-planner/issues/874) Remote-MCP | #871 | |
| [inventory-planner#27](https://github.com/larszu/inventory-planner/issues/27) Nachfragetest Ladeplanung | **15 zahlende Vorbestellungen in 8 Wochen** — die Schwelle steht vor dem Test, nicht danach | „Der Test lief, das Ergebnis ist *…*. Bau den Packer / leg die Ladeplanung still." |

Eine Schwelle, die man nach dem Ergebnis festlegt, ist keine Schwelle, sondern
eine Begründung. Deshalb steht sie in beiden Fällen vorher fest — und deshalb
darf sie niemand hier nachträglich weicher schreiben.

---

## 4 · Ein reales Projekt, das man nachsehen kann

| Issue | Offen | Es fehlt |
|---|---|---|
| [larszu-facility-planner#2](https://github.com/larszu/larszu-facility-planner/issues/2) | **Crestron/Vissonic: was dort „eine Klinke" überhaupt ist** | eine solche Anlage, an der man es nachsieht. Beide Systeme sind heute über `system` und eine Adresse abbildbar; ob das ihrer Wirklichkeit entspricht, kann nur jemand sagen, der davorsteht |

Das ETS-Stück dieses Issues ist inzwischen erledigt — gelesen wird der
CSV-Gruppenadress-Export, den ETS selbst schreibt, **nicht** die `.knxproj`
(ein ZIP mit wechselndem, teils verschlüsseltem Schema). Und heraus kommen
**Kandidaten, keine Klinken**: eine ETS-Datei enthält auch Notlicht, Jalousien
und Heizung, und die alle freizugeben hieße, eine Freigabe zu erfinden, die
niemand erteilt hat.

---

## 5 · Was gar nicht blockiert ist

Damit dieser Zettel nicht als Ausrede gelesen wird — gezählt am 2026-09-19:

| Repo | Offene Issues |
|---|---:|
| av-planner-suite | 0 |
| multicam-planner | 0 |
| light-planner | 0 |
| Broadcast-intercom | 0 |
| tally-pi | 0 |
| pi-media-station | 0 |
| larszu-facility-planner | 1 |
| inventory-planner | 2 |
| cable-planner | 6 |
| sony-camera-bridge | 22 |

Eins davon — sony-camera-bridge#58, das Geraeteprofil-Format — ist seit dem
Stand dieser Seite geschlossen; die Zahlen oben sind die vom Zeitpunkt der
Zaehlung.

**Jedes einzelne dieser 31 Issues steht oben.** Es gibt keine offene Zeile, die
hier fehlt und auch keine, die auf Programmierarbeit wartet — die Restliste ist
genau diese Seite.

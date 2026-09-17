# ADR-008: Die B4-Objektivsteuerung gehört in die Camera Bridge

Status: entschieden · Datum: 2026-09-17 · Betrifft: die Ablage der B4-Objektivsteuerung
und die Grenze zwischen Kamera und Optik in der Suite

## Das Problem

Geplant ist eine ESP32-Brücke zwischen einer Broadcast-Kamera und einer 2/3"-B4-Optik:
analoge Iris-Steuerung plus ein serielles Protokoll auf Pin 11/12 des Hirose-12-Pin,
dazu Zoom- und Fokus-Demands als Eingabegeräte und später FreeD-Ausgabe für virtuelle
Produktion. Die Frage war, ob das ein eigenes Repo wird — wie `light-planner` und
`multicam-planner` es nach ADR-006 geworden sind — oder ob es in `sony-camera-bridge`
(Produktname **LZ Camera Bridge**) einzieht.

Die Frage ist nicht kosmetisch. Sie entscheidet, ob es künftig **eine oder zwei
Antworten auf „was ist der aktuelle Iris-Wert"** gibt.

## Das Kriterium — ADR-006, unverändert angewendet

ADR-006 nennt vier Bedingungen. Ein Bereich wird ein eigenes Werkzeug, wenn er eigene
Stammdaten führt, andere Rollen ihn bedienen, er ohne den Kern vollständig ist, und die
Verbindung zum Kern sich auf wenige benannte Fragen reduzieren lässt.

Für die B4-Objektivsteuerung, gegen die Bridge geprüft:

| Bedingung | Befund |
| --- | --- |
| **Eigene Stammdaten?** | **Nein.** Eine Optik ist kein Gerät neben der Kamera, sondern eine Eigenschaft von ihr. Offenblende, Brennweiten und Naheinstellgrenze (`0x13`–`0x16`) beschreiben, was diese Kamera kann. |
| **Andere Rollen?** | **Nein.** Dieselbe Person bedient Paint und Iris an derselben RCP. Es gibt keinen „Objektiv-Operator" neben dem Kameramann. |
| **Ohne den Kern vollständig?** | **Nein.** Eine Iris ohne Kamera ist kein Arbeitsgegenstand. |
| **Wenige benannte Fragen?** | **Nein — und das ist der entscheidende Punkt.** Iris, Fokus und Zoom sind keine Schnittstelle *zur* Bridge. Sie sind bereits die normalisierten Befehle *der* Bridge, über acht Kameraclients hinweg (VISCA, Sony, Panasonic, JVC, Birddog, Blackmagic, DJI, Lumix). |

Keine der vier Bedingungen trägt. Nach dem Kriterium, das die Suite sich selbst gegeben
hat, ist die B4-Objektivsteuerung **kein eigenes Werkzeug**.

Der gemessene Befund dahinter steht in
[`sony-camera-bridge/docs/reuse-audit.md`](https://github.com/larszu/sony-camera-bridge/blob/master/docs/reuse-audit.md):
rund 70 % der nicht-objektivspezifischen Arbeit liegt dort bereits lauffähig — der
WebSocket-Bus auf `:9700`, das Paar aus `cameras/` und `protocol/` je Gerätefamilie,
`ViscaSerialTransport` als nächster Verwandter einer seriellen Anbindung, `web-rcp` als
Oberfläche, und mit `packages/firmware/` sogar schon eine eingebettete Firmware.

## Die Entscheidung

Der Eigentümer hat am 2026-09-17 entschieden: **alles ins Monorepo.**

| Teil | Wohin |
| --- | --- |
| ESP32-Firmware (Iris, serielles Protokoll, Demands) | `sony-camera-bridge/packages/firmware-b4` |
| Lens-Backend, Framing des L10-artigen Frames | `packages/bridge/src/cameras/` und `protocol/`, wie jede andere Gerätefamilie |
| Bedienung | `packages/web-rcp` — **dieselbe Iris wie bei jeder anderen Kamera** |
| Quellmaterial, Messprotokolle | `sony-camera-bridge/docs/b4/` |

## Warum ADR-003 hier besonders zählt

[ADR-003](ADR-003-confirmed-state.md) verlangt bestätigten Zustand statt gesendeten
Befehl. Die Bridge setzt das bereits um: das `state`-Nachrichtenfeld trennt `origins` von
`confirmations`.

Bei der B4-Optik ist das keine Feinheit, sondern die tragende Regel. **Jede elektrische
Angabe über diese Schnittstelle stammt aus fremder Rekonstruktion, nicht aus
Herstellerdokumentation** — die Urheber der Quellen weisen ausdrücklich darauf hin, dass
ihre Informationen fehlerhaft sein können. Ein Sollwert, der nicht an Pin 7 zurückgelesen
wurde, ist deshalb kein Wert, sondern eine Absicht.

Eine eigene Ablage hätte diese Unterscheidung ein zweites Mal erfunden — vermutlich
schlechter, weil ohne acht Geräteclients, an denen sie sich schon bewährt hat.

## Was der Preis ist, und warum er akzeptiert wird

`packages/firmware` ist bare-metal `arm-none-eabi-gcc` mit handgeschriebenem Makefile für
einen WIZnet W7500P. Das B4-Ziel ist ein ESP32 mit PoE unter ESP-IDF oder Arduino-Core.
Das sind **zwei eingebettete Toolchains in einem Repo.**

Das ist das einzige ernsthafte Argument für ein eigenes Repo, und es wird hier bewusst
bezahlt. Begründung: die Pakete bauen unabhängig, der Schmerz bleibt auf die
Werkzeugkette begrenzt und trifft niemanden, der nur die Bridge baut. Eine geteilte
Wahrheit über Iris-Werte dagegen träfe jeden Anwender, jeden Tag.

## Folgen

- Die **neun CI-Gates** der Bridge gelten auch für die neue Arbeit: `npm test`,
  `lock:check`, `actions:check`, `brand:check`, `slider:check`, `netz:check`,
  `lang:check`, `caps:parity`. Eine Iris-Bedienfläche muss `slider:check` und ADR-007
  genügen wie jede andere.
- Zu klären ist, ob `firmware-b4` in CI gebaut wird oder zunächst nicht; eine zweite
  Toolchain in der Pipeline ist eine eigene Entscheidung.
- **`caps:parity`**: Offenblende, Brennweiten und MOD sind planungsrelevante Angaben. Ob
  sie in den Capability-Vertrag mit `multicam-planner` gehören, ist zu beantworten, bevor
  das Lens-Backend sie füllt — nachträgliches Umbenennen hieße, zwei Repos gleichzeitig
  zu ändern.
- Der Default-Branch von `sony-camera-bridge` ist **`master`**, nicht `main`. Das ist in
  dieser Suite uneinheitlich und vor jedem Push einzeln festzustellen.

## Ausdrücklich nicht entschieden

**Die Runtime.** ESP-IDF oder Arduino-Core ist offen und gehört in eine eigene
Entscheidung. Sie hat ein konkretes Kriterium, das nicht Geschmack ist: das serielle
Protokoll läuft mit **invertierter Polarität**, und die Invertierung soll in der
Hardware-Einstellung der UART sitzen, nicht in Software — sonst brechen Framing und
Break-Erkennung, und der Fehler fällt erst beim CRC auf, also an der falschen Stelle.
Welcher der beiden Wege das sauber zugänglich macht, entscheidet.

Ebenfalls offen: ob `firmware-b4` in die CI-Pipeline aufgenommen wird.

## Status der Quellen

Die Protokoll- und Pinangaben stammen aus öffentlicher Rekonstruktion
(`yasdfgr/fujinon-tv-lens-control` und Fork) und einem Anschlussblatt des 3ality SPC-7000
von 2010. Die beiden Quellen bestätigen die 12-Pin-Belegung unabhängig voneinander, was
sie glaubwürdiger macht — aber nicht verifiziert. **Vor jedem Anschluss ist nachzumessen.**
Ein Broadcast-Objektiv kostet vier- bis fünfstellig; ein falsch belegter Steuerpin
zerstört die Servoelektronik.

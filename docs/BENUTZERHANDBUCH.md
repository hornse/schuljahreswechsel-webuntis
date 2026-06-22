# Benutzerhandbuch

## Übersicht der Ansichten

Die App hat drei Tabs:

- **Dashboard** – öffentliche Statusübersicht ohne Anmeldung
- **Zeitstrahl** – Gantt- und Timeline-Ansicht, öffentlich (ohne sensible Felder)
- **Checkliste** – nur nach Anmeldung, mit allen Details und Bearbeitungsmöglichkeiten

---

## Dashboard (öffentlich)

Zeigt ohne Anmeldung:
- Welcher Schritt gerade dran ist
- Überfällige Schritte (Zieldatum in der Vergangenheit, noch nicht erledigt)
- Schritte, die in den nächsten 14 Tagen fällig sind
- Fortschritt je Phase als Balken

Bewusst nicht öffentlich sichtbar: wer zuständig ist (Verantwortlich)
und eingetragene Kommentare.

---

## Zeitstrahl (öffentlich, erweitert nach Anmeldung)

Zwei Untertabs:

**Gantt:** Horizontale Ansicht mit Datumsachse. Schritte mit Start- und
Zieldatum erscheinen als durchgehender farbiger Balken. Schritte mit nur
einem Zieldatum erscheinen als Punkt. Der heutige Tag ist hervorgehoben,
erledigte Schritte sind ausgeblendet, überfällige haben einen roten Rand.

**Timeline:** Chronologische Liste von oben nach unten mit Datums-Trennlinien
und Phasen-Farbbalken. Praktisch für den laufenden Betrieb – was kommt als
nächstes? Bei Schritten mit Startdatum erscheint ein „ab TT.MM."-Hinweis.

In beiden Ansichten erscheinen Schritte ohne Datum am Ende als einfache
Liste. Nach Anmeldung wird zusätzlich der Verantwortliche angezeigt.

---

## Anmeldung

Über den Button „Anmelden" oben rechts mit den gewohnten
WebUntis-Zugangsdaten. Ein korrektes Passwort allein reicht nicht – die
Person muss zusätzlich von einem Admin freigegeben worden sein (siehe
„Zugriff verwalten" unten). Schüler- und Erziehungsberechtigten-Logins
werden immer abgewiesen.

---

## Checkliste (nach Anmeldung)

Über den Tab „Checkliste" erreichbar. Jeden Schritt anklicken, um Details
aufzuklappen:

**Häkchen** – setzt den Schritt auf erledigt (erscheint durchgestrichen,
Fortschrittsbalken aktualisiert sich).

**Verantwortlich** – Freitext, wer diesen Schritt übernimmt.

**Start** – optionales Startdatum. Zusammen mit dem Zieldatum wird ein
Zeitraum definiert, der im Gantt als Balken dargestellt wird.

**Zieldatum** – geplantes Enddatum. Schritte mit überlappenden Zeiträumen
werden automatisch als parallel erkannt und mit gestricheltem Rahmen und
„⇉ parallel"-Badge zusammengefasst.

**Parallel möglich** – manuelles Flag für dieses Schuljahr, unabhängig
von den eingetragenen Daten.

**Weiterführende Infos** – erscheint wenn ein Admin Notizen hinterlegt
hat (Markdown-formatiert). Nur für angemeldete Personen sichtbar.

Alle Änderungen werden beim Verlassen des Felds automatisch gespeichert.
Datumsfelder und der Parallel-Toggle aktualisieren den Zeitstrahl sofort.

### Schuljahr-Auswahl

Oben links in der Checkliste erscheint ein Auswahlfeld sobald mehr als
ein Schuljahr existiert. Vergangene Schuljahre öffnen sich in einer
read-only Archiv-Ansicht – Häkchen und Felder sind gesperrt.

---

## Admin-Bereich

Erscheint nach Anmeldung mit der Rolle „admin" am Ende der Seite.

### Schuljahre

**Neues Schuljahr anlegen:** Label eingeben (z. B. „2027/2028") und eine
Basis wählen:
- „Aktuelle Vorlage" – kopiert alle aktiven Schritte und Phasen
- Ein gespeicherter Snapshot – legt eine eigene Kopie der Phasen und
  Schritte aus dem Snapshot an (nützlich für andere Prozesse)

Das neue Schuljahr wird automatisch aktiv, das alte bleibt als Archiv.

**Schuljahr aktivieren:** Über den Button in der Tabelle kann ein früheres
Schuljahr wieder aktiv gesetzt werden.

### Vorlagen-Snapshots

**Jetzt einfrieren:** Speichert den aktuellen Stand aller Phasen und
aktiven Schritte als benannten Snapshot. Der Snapshot ist danach
eingefroren – spätere Änderungen an der aktiven Vorlage verändern ihn
nicht.

Snapshots eignen sich, um verschiedene Prozesse parallel zu verwalten –
z. B. „WebUntis-Wechsel", „Abitur-Organisation", „Geräteausgabe" jeweils
als eigene Vorlage.

Über „löschen" wird ein Snapshot vollständig entfernt (mit
Bestätigungsdialog).

### Zugriff verwalten

Nur Personen in dieser Liste können sich anmelden. Vor dem ersten Login
einer Person hier „Freigeben" klicken – das WebUntis-Kürzel muss exakt
dem Benutzernamen in WebUntis entsprechen.

- **Rolle ändern:** Über das Auswahlfeld in der Zeile (mitglied ↔ admin).
  Wirkt sofort beim nächsten Seitenaufruf, ohne erneuten Login.
- **Entfernen:** „entfernen"-Button mit Bestätigungsdialog. Der eigene
  Account und der letzte verbliebene Admin können nicht entfernt werden.

### Checkliste verwalten

Hier wird die wiederkehrende Vorlage gepflegt. Änderungen wirken sich
sofort auf das laufende Schuljahr aus.

**Phasen:**
- Am ⠿-Griff per Drag-and-Drop umsortieren – die Nummerierung
  (1., 2., 3. ...) passt sich automatisch an
- Farbpicker zum Ändern der Phasenfarbe
- Phasenname direkt im Textfeld bearbeiten
- „Phase anlegen" für neue Phasen (Name und Farbe)

**Schritte je Phase:**
- Am ⠿-Griff innerhalb der Phase umsortieren
- Titel direkt im Textfeld bearbeiten
- Phasenwechsel über das Auswahlfeld (Schritt landet ans Ende der neuen Phase)
- „⇉ Default" – Parallel-Flag als Vorlage-Default für neue Schuljahre
- „deaktivieren" – entfernt den Schritt aus künftigen Schuljahren,
  lässt ihn im laufenden Schuljahr bestehen
- „+ Neuer Schritt" am Ende jedes Phasen-Blocks

**Weiterführende Infos (ausgeklappt über ▸):**
Formatierungs-Buttons für Fett, Kursiv, Aufzählung, nummerierte Liste und
Links. Direkte Markdown-Eingabe ist ebenfalls möglich. Live-Vorschau
erscheint direkt unter dem Textfeld. Unterstützte Syntax:

| Eingabe | Ergebnis |
|---|---|
| `**Text**` | **Fett** |
| `*Text*` | *Kursiv* |
| `- Punkt` | Aufzählung |
| `1. Punkt` | Nummerierte Liste |
| `[Linktext](https://...)` | Link |

---

## Was die App (noch) nicht kann

- Keine E-Mail-Erinnerungen
- Kein Zeitstrahl für vergangene Schuljahre (nur Checkliste)
- Kein vollständiges Entfernen der letzten Admin-Person über die
  Oberfläche (dann direkter DB-Zugriff nötig, siehe INSTALL.md)

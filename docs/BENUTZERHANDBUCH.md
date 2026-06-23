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

Bewusst nicht öffentlich sichtbar: Verantwortlich, Kommentare und
weiterführende Infos.

---

## Zeitstrahl (öffentlich, erweitert nach Anmeldung)

Zwei Untertabs:

**Gantt:** Horizontale Ansicht mit Datumsachse. Schritte mit Start- und
Zieldatum erscheinen als durchgehender farbiger Balken. Schritte mit nur
einem Zieldatum erscheinen als Punkt. Der heutige Tag ist hervorgehoben,
erledigte Schritte sind ausgeblendet, überfällige haben einen roten Rand.
Ein Zoom-Schieberegler (1–7 Tage pro Spalte) ermöglicht Tages- bis
Wochenansicht.

**Timeline:** Chronologische Liste von oben nach unten mit Datums-
Trennlinien und Phasen-Farbbalken. Bei Schritten mit Startdatum erscheint
ein „ab TT.MM."-Hinweis.

In beiden Ansichten erscheinen Schritte ohne Datum am Ende als einfache
Liste. Nach Anmeldung wird zusätzlich der Verantwortliche angezeigt.

**Export:** Über die Schaltflächen oben rechts lässt sich der Zeitstrahl
als SVG-Datei (⬇ SVG) oder über den Browser-Druckdialog als PDF
(🖨 Drucken) exportieren.

---

## Anmeldung

Über den Button „Anmelden" oben rechts mit den gewohnten
WebUntis-Zugangsdaten. Ein korrektes Passwort allein reicht nicht – die
Person muss zusätzlich von einem Admin freigegeben worden sein. Schüler-
und Erziehungsberechtigten-Logins werden immer abgewiesen.

Wenn ein lokales Notfall-Passwort gesetzt wurde (siehe unten), kann
alternativ damit eingeloggt werden – auch wenn WebUntis nicht erreichbar
ist.

---

## Checkliste (nach Anmeldung)

Über den Tab „Checkliste" erreichbar. Jeden Schritt anklicken, um Details
aufzuklappen:

**Häkchen** – setzt den Schritt auf erledigt. Die Aktion wird im
Aktivitätsprotokoll aufgezeichnet.

**Verantwortlich** – Freitext, wer diesen Schritt übernimmt.

**Start** – optionales Startdatum. Zusammen mit dem Zieldatum wird ein
Zeitraum definiert, der im Gantt als Balken dargestellt wird.

**Zieldatum** – geplantes Enddatum. Schritte mit überlappenden Zeiträumen
werden automatisch als parallel erkannt und mit gestricheltem Rahmen und
„⇉ parallel"-Badge zusammengefasst.

**Parallel möglich** – manuelles Flag für dieses Schuljahr, unabhängig
von den eingetragenen Daten.

**Kommentar** – schuljahrspezifische Kurznotiz zum aktuellen Stand.
Nur für angemeldete Personen sichtbar. Im Archiv-Modus read-only.

**Weiterführende Infos** – vom Admin hinterlegte Hinweise (Markdown).
Nur für angemeldete Personen sichtbar, nicht bearbeitbar.

Alle Änderungen werden beim Verlassen des Felds automatisch gespeichert.
Datumsfelder und der Parallel-Toggle aktualisieren den Zeitstrahl sofort.
Aufgeklappte Detail-Boxen bleiben auch nach einer Aktualisierung offen.

**Export:** Über ⬇ CSV wird die vollständige Checkliste heruntergeladen
(UTF-8, Semikolon-getrennt, öffnet direkt in Excel). Über 🖨 PDF öffnet
sich der Browser-Druckdialog.

### Schuljahr-Auswahl

Oben links erscheint ein Auswahlfeld sobald mehr als ein Schuljahr
existiert. Vergangene Schuljahre öffnen sich als read-only Archiv-Ansicht.

---

## Admin-Bereich

Erscheint nach Anmeldung mit der Rolle „admin" am Ende der Seite.

### Schuljahre

**Neues Schuljahr anlegen:** Label eingeben (z. B. „2027/2028") und eine
Basis wählen:
- „Aktuelle Vorlage" – kopiert alle aktiven Schritte und Phasen
- Ein gespeicherter Snapshot – legt eine eigene Kopie der Phasen und
  Schritte aus dem Snapshot an

Das neue Schuljahr wird automatisch aktiv, das alte bleibt als Archiv.

### Vorlagen-Snapshots

**Jetzt einfrieren:** Speichert den aktuellen Stand aller Phasen und
aktiven Schritte als benannten Snapshot. Spätere Änderungen verändern
ihn nicht.

Snapshots eignen sich für verschiedene Prozesse, z. B. „WebUntis-Wechsel",
„Abitur-Organisation" oder „Geräteausgabe".

### Zugriff verwalten

Nur Personen in dieser Liste können sich anmelden. Vor dem ersten Login
einer Person hier „Freigeben" klicken – das WebUntis-Kürzel muss exakt
dem Benutzernamen in WebUntis entsprechen.

- **Rolle ändern:** Über das Auswahlfeld (mitglied ↔ admin). Wirkt sofort.
- **Entfernen:** Mit Bestätigungsdialog. Eigener Account und letzter Admin
  sind geschützt.

### Checkliste verwalten

**Phasen:**
- Am ⠿-Griff per Drag-and-Drop umsortieren – Nummerierung passt sich an
- Farbwahl über eigene Farbpalette (15 Farben + Hex-Eingabe)
- Phasenname direkt im Textfeld bearbeiten
- „Phase anlegen" für neue Phasen

**Schritte je Phase:**
- Am ⠿-Griff innerhalb der Phase umsortieren
- Titel direkt im Textfeld bearbeiten
- Phasenwechsel über Auswahlfeld
- „⇉ Default" – Parallel-Flag als Vorlage-Default
- „deaktivieren" – entfernt Schritt aus künftigen Schuljahren
- „+ Neuer Schritt" am Ende jedes Phasen-Blocks

**Weiterführende Infos (ausgeklappt über ▸):**
Markdown-Textarea mit Formatierungs-Buttons und Live-Vorschau.
Unterstützte Syntax:

| Eingabe | Ergebnis |
|---|---|
| `**Text**` | **Fett** |
| `*Text*` | *Kursiv* |
| `- Punkt` | Aufzählung |
| `1. Punkt` | Nummerierte Liste |
| `[Linktext](https://...)` | Link |

### Aktivitätsprotokoll

Zeigt die letzten 200 Aktionen: wer hat wann welchen Schritt erledigt,
Verantwortliche gesetzt, Datum eingetragen oder Kommentar hinterlegt.
Über „⬇ Als CSV exportieren" vollständig herunterladbar.

---

## Lokales Notfall-Passwort (nur per SSH auf dem Server)

Für den Fall dass WebUntis nicht erreichbar ist, gibt es zwei Optionen:

**Lokales Passwort für bestehenden WebUntis-Nutzer:** Das Passwort wird
an ein vorhandenes Kürzel gehängt. Bei der Anmeldung hat das lokale
Passwort Vorrang – stimmt es nicht, wird trotzdem gegen WebUntis geprüft.

**Vollständig unabhängiger lokaler Benutzer:** Ein Benutzer der nicht an
ein WebUntis-Kürzel gebunden ist (z. B. `notfalladmin`). Er funktioniert
ausschließlich mit dem lokalen Passwort, völlig unabhängig von WebUntis.

Beide Varianten werden ausschließlich per SSH auf dem Server eingerichtet,
es gibt kein UI dafür. Genaue Befehle siehe `docs/INSTALL.md`, Abschnitt 6.

---

## Was die App (noch) nicht kann

- Keine E-Mail-Erinnerungen
- Kein Zeitstrahl für vergangene Schuljahre (nur Checkliste)
- Kein vollständiges Entfernen der letzten Admin-Person über die
  Oberfläche (dann direkter DB-Zugriff nötig, siehe INSTALL.md)

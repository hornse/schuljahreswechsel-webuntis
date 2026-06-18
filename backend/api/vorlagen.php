<?php

/**
 * Endpunkte: GET /api/vorlagen, POST /api/vorlagen,
 *            PATCH /api/vorlagen/{id}, POST /api/vorlagen/reihenfolge
 *
 * Verwaltung der wiederkehrenden Schritt-VORLAGE selbst (nicht der
 * Instanzen für ein einzelnes Schuljahr - dafür ist schritte.php
 * zuständig). Alles hier ist admin-only, weil es die Arbeitsgrundlage
 * für künftige (und bei Neuanlage/Reihenfolge auch das aktuelle)
 * Schuljahre verändert.
 */

use App\Guard;
use App\Response;

function handleListVorlagen(PDO $db): void
{
    Guard::requireAdmin($db);
    $rows = $db->query(
        'SELECT id, phase, phase_farbe, reihenfolge, titel, beschreibung, aktiv
         FROM schritt_vorlagen ORDER BY phase, reihenfolge'
    )->fetchAll();
    Response::json($rows);
}

/**
 * Legt eine neue Vorlage an (ans Ende ihrer Phase) und erstellt sofort
 * auch eine Instanz im AKTUELL aktiven Schuljahr, falls eines existiert -
 * sonst würde ein neu ergänzter Schritt erst im nächsten Schuljahr
 * auftauchen, was beim "ich hab was vergessen"-Anwendungsfall verwirrend
 * wäre.
 */
function handleCreateVorlage(PDO $db, array $config, array $input): void
{
    Guard::requireAdmin($db);

    $phase = trim((string) ($input['phase'] ?? ''));
    $titel = trim((string) ($input['titel'] ?? ''));
    $phaseFarbe = trim((string) ($input['phase_farbe'] ?? '')) ?: '#5B6FA8';
    $beschreibung = $input['beschreibung'] ?? null;

    if ($phase === '' || $titel === '') {
        Response::error('phase und titel sind erforderlich.', 400);
    }

    $db->beginTransaction();
    try {
        $maxStmt = $db->prepare('SELECT COALESCE(MAX(reihenfolge), 0) FROM schritt_vorlagen WHERE phase = :phase');
        $maxStmt->execute([':phase' => $phase]);
        $naechsteReihenfolge = (int) $maxStmt->fetchColumn() + 1;

        $insert = $db->prepare(
            'INSERT INTO schritt_vorlagen (phase, phase_farbe, reihenfolge, titel, beschreibung)
             VALUES (:phase, :farbe, :reihenfolge, :titel, :beschreibung)'
        );
        $insert->execute([
            ':phase' => $phase, ':farbe' => $phaseFarbe, ':reihenfolge' => $naechsteReihenfolge,
            ':titel' => $titel, ':beschreibung' => $beschreibung,
        ]);
        $vorlageId = (int) $db->lastInsertId();

        $aktivesSchuljahr = $db->query('SELECT id FROM schuljahre WHERE aktiv = 1 LIMIT 1')->fetchColumn();
        if ($aktivesSchuljahr) {
            $db->prepare(
                'INSERT INTO schritt_instanzen (schuljahr_id, vorlage_id) VALUES (:sj, :v)'
            )->execute([':sj' => $aktivesSchuljahr, ':v' => $vorlageId]);
        }

        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    Response::json(['id' => $vorlageId], 201);
}

/**
 * Erlaubt Titel, Beschreibung, Farbe, Aktiv-Status und einen Phasenwechsel.
 * Reihenfolge selbst wird hier NICHT direkt gesetzt (dafür gibt es den
 * eigenen Reihenfolge-Endpunkt fürs Drag-and-Drop) - außer beim
 * Phasenwechsel, da wird automatisch ans Ende der neuen Phase angehängt.
 */
function handleUpdateVorlage(PDO $db, array $config, array $input, array $params): void
{
    Guard::requireAdmin($db);
    $id = (int) $params['id'];

    $aktuelleStmt = $db->prepare('SELECT phase FROM schritt_vorlagen WHERE id = :id');
    $aktuelleStmt->execute([':id' => $id]);
    $aktuellePhase = $aktuelleStmt->fetchColumn();
    if ($aktuellePhase === false) {
        Response::error('Vorlage nicht gefunden.', 404);
    }

    $sets = [];
    $werte = [':id' => $id];

    foreach (['titel', 'beschreibung', 'phase_farbe'] as $feld) {
        if (array_key_exists($feld, $input)) {
            $sets[] = "$feld = :$feld";
            $werte[":$feld"] = $input[$feld];
        }
    }

    if (array_key_exists('aktiv', $input)) {
        $sets[] = 'aktiv = :aktiv';
        $werte[':aktiv'] = $input['aktiv'] ? 1 : 0;
    }

    if (array_key_exists('phase', $input) && $input['phase'] !== $aktuellePhase) {
        $maxStmt = $db->prepare('SELECT COALESCE(MAX(reihenfolge), 0) FROM schritt_vorlagen WHERE phase = :phase');
        $maxStmt->execute([':phase' => $input['phase']]);
        $sets[] = 'phase = :phase';
        $sets[] = 'reihenfolge = :reihenfolge';
        $werte[':phase'] = $input['phase'];
        $werte[':reihenfolge'] = (int) $maxStmt->fetchColumn() + 1;
    }

    if (empty($sets)) {
        Response::error('Keine gültigen Felder übergeben.', 400);
    }

    $db->prepare('UPDATE schritt_vorlagen SET ' . implode(', ', $sets) . ' WHERE id = :id')->execute($werte);
    Response::json(['ok' => true]);
}

/**
 * Wird nach einer Drag-and-Drop-Aktion im Frontend aufgerufen: bekommt
 * die komplette, neue Reihenfolge der IDs innerhalb EINER Phase und
 * schreibt reihenfolge = Position in diesem Array. Bewusst auf eine
 * Phase begrenzt (kein phasenübergreifendes Drag-and-Drop, siehe
 * Begründung im Chat/README) - ein Phasenwechsel läuft über
 * PATCH .../{id} mit dem Feld "phase".
 */
function handleReihenfolgeVorlagen(PDO $db, array $config, array $input): void
{
    Guard::requireAdmin($db);

    $phase = trim((string) ($input['phase'] ?? ''));
    $ids = $input['vorlage_ids'] ?? null;

    if ($phase === '' || !is_array($ids) || empty($ids)) {
        Response::error('phase und vorlage_ids (nicht-leeres Array) sind erforderlich.', 400);
    }

    $db->beginTransaction();
    $stmt = $db->prepare('UPDATE schritt_vorlagen SET reihenfolge = :r WHERE id = :id AND phase = :phase');
    foreach (array_values($ids) as $index => $id) {
        $stmt->execute([':r' => $index + 1, ':id' => (int) $id, ':phase' => $phase]);
    }
    $db->commit();

    Response::json(['ok' => true]);
}

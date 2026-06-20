<?php

/**
 * Endpunkte: GET /api/rollen, POST /api/rollen, DELETE /api/rollen/{user}
 *
 * Alle nur für Admins zugänglich.
 */

use App\Guard;
use App\Response;

function handleListRollen(PDO $db): void
{
    Guard::requireAdmin($db);
    $rows = $db->query(
        'SELECT webuntis_user, anzeigename, rolle, erstellt_am FROM benutzer_rollen ORDER BY anzeigename'
    )->fetchAll();
    Response::json($rows);
}

function handleUpsertRolle(PDO $db, array $config, array $input): void
{
    Guard::requireAdmin($db);

    $username    = trim((string) ($input['webuntis_user'] ?? ''));
    $rolle       = (string) ($input['rolle'] ?? 'mitglied');
    $anzeigename = trim((string) ($input['anzeigename'] ?? '')) ?: $username;

    if ($username === '' || !in_array($rolle, ['admin', 'mitglied'], true)) {
        Response::error('webuntis_user und eine gültige rolle (admin|mitglied) sind erforderlich.', 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO benutzer_rollen (webuntis_user, anzeigename, rolle) VALUES (:u, :name, :rolle)
         ON CONFLICT(webuntis_user) DO UPDATE SET anzeigename = :name, rolle = :rolle'
    );
    $stmt->execute([':u' => $username, ':name' => $anzeigename, ':rolle' => $rolle]);

    Response::json(['ok' => true]);
}

function handleDeleteRolle(PDO $db, array $config, array $input, array $params): void
{
    $aktuellerAdmin = Guard::requireAdmin($db);
    $username = urldecode($params['user']);

    // Selbst-Entfernung verhindern
    if ($username === $aktuellerAdmin['webuntis_user']) {
        Response::error('Du kannst dich nicht selbst aus der Zugriffsliste entfernen.', 403);
    }

    // Letzten Admin schützen: prüfen ob nach dem Löschen noch mindestens
    // ein Admin übrig bleibt
    $zielRolle = $db->prepare('SELECT rolle FROM benutzer_rollen WHERE webuntis_user = :u');
    $zielRolle->execute([':u' => $username]);
    $zeile = $zielRolle->fetch();

    if (!$zeile) {
        Response::error('Person nicht gefunden.', 404);
    }

    if ($zeile['rolle'] === 'admin') {
        $adminAnzahl = (int) $db->query("SELECT COUNT(*) FROM benutzer_rollen WHERE rolle = 'admin'")->fetchColumn();
        if ($adminAnzahl <= 1) {
            Response::error('Der letzte Admin kann nicht entfernt werden.', 403);
        }
    }

    $db->prepare('DELETE FROM benutzer_rollen WHERE webuntis_user = :u')->execute([':u' => $username]);
    Response::json(['ok' => true]);
}

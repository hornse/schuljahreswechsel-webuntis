<?php

/**
 * Endpunkte: GET /api/rollen, POST /api/rollen
 *
 * Beide nur für Admins zugänglich. Über diesen Endpunkt wird auch der
 * erste Admin "befördert" - siehe docs/BENUTZERHANDBUCH.md.
 */

use App\Guard;
use App\Response;

function handleListRollen(PDO $db): void
{
    Guard::requireAdmin();
    $rows = $db->query(
        'SELECT webuntis_user, anzeigename, rolle, erstellt_am FROM benutzer_rollen ORDER BY anzeigename'
    )->fetchAll();
    Response::json($rows);
}

function handleUpsertRolle(PDO $db, array $config, array $input): void
{
    Guard::requireAdmin();

    $username = trim((string) ($input['webuntis_user'] ?? ''));
    $rolle = (string) ($input['rolle'] ?? 'mitglied');
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

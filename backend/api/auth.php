<?php

/**
 * Endpunkte: POST /api/login, POST /api/logout, GET /api/me
 *
 * Die eigentliche Passwortprüfung steckt komplett in
 * App\Auth\WebUntisAuth - hier wird nur die HTTP-Schicht drumherum gebaut
 * und beim ersten erfolgreichen Login automatisch eine Rollen-Zeile
 * angelegt (Standardrolle: 'mitglied').
 */

use App\Auth\WebUntisAuth;
use App\Response;
use App\Session;

function handleLogin(PDO $db, array $config, array $input): void
{
    $username = (string) ($input['username'] ?? '');
    $password = (string) ($input['password'] ?? '');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';

    $auth = new WebUntisAuth($config, $db);
    $result = $auth->authenticate($username, $password, $ip);

    if ($result === null) {
        // Bewusst eine einzige, unspezifische Meldung für "falsches
        // Passwort", "falsche Rolle" und "zu viele Versuche" - Details
        // stehen im login_log, sollen aber nicht an den Client verraten
        // werden (kein Username-Enumeration- bzw. Rollen-Leak).
        Response::error('Anmeldung nicht möglich. Bitte Zugangsdaten prüfen.', 401);
    }

    $rolle = ensureBenutzerRolle($db, $result['username']);

    $user = [
        'webuntis_user' => $result['username'],
        'anzeigename'   => $rolle['anzeigename'] ?: $result['username'],
        'rolle'         => $rolle['rolle'],
    ];

    Session::login($user);
    Response::json($user);
}

function handleLogout(): void
{
    Session::logout();
    Response::json(['ok' => true]);
}

function handleMe(): void
{
    $user = Session::currentUser();
    if ($user === null) {
        Response::error('Nicht angemeldet.', 401);
    }
    Response::json($user);
}

/**
 * Holt die Rollen-Zeile zu einem WebUntis-Benutzernamen oder legt sie mit
 * der Standardrolle 'mitglied' an, falls sich diese Person zum ersten Mal
 * anmeldet. Niemand wird allein durch Einloggen automatisch Admin - das
 * muss explizit über POST /api/rollen durch einen bestehenden Admin
 * passieren (siehe docs/BENUTZERHANDBUCH.md, Abschnitt "Erste:n Admin
 * einrichten").
 */
function ensureBenutzerRolle(PDO $db, string $username): array
{
    $stmt = $db->prepare('SELECT anzeigename, rolle FROM benutzer_rollen WHERE webuntis_user = :u');
    $stmt->execute([':u' => $username]);
    $row = $stmt->fetch();

    if ($row) {
        return $row;
    }

    $insert = $db->prepare(
        'INSERT INTO benutzer_rollen (webuntis_user, anzeigename, rolle) VALUES (:u, :u, \'mitglied\')'
    );
    $insert->execute([':u' => $username]);

    return ['anzeigename' => $username, 'rolle' => 'mitglied'];
}

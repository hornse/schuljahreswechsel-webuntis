<?php
/*
 * Schuljahreswechsel WebUntis
 * Copyright (C) 2026 Sebastian Horn, Friedrich-Rückert-Gymnasium Düsseldorf
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Endpunkte: POST /api/login, POST /api/logout, GET /api/me
 *
 * Die eigentliche Passwortprüfung steckt komplett in
 * App\Auth\WebUntisAuth - hier kommt zusätzlich die Freigabe-Liste dazu:
 * ein korrektes WebUntis-Passwort allein reicht NICHT mehr aus, die
 * Person muss zusätzlich schon in benutzer_rollen stehen (von einem
 * Admin vorab eingetragen, siehe api/rollen.php). Das ist die bewusste
 * Umstellung von "jede Lehrkraft kann sich einloggen" auf "nur das
 * Untis/WebUntis-Team".
 */

use App\Auth\WebUntisAuth;
use App\Guard;
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
        // Passwort", "falsche Rolle (z. B. Schüler)" und "zu viele
        // Versuche" - Details stehen im login_log, sollen aber nicht an
        // den Client verraten werden (kein Username-Enumeration-Leak).
        Response::error('Anmeldung nicht möglich. Bitte Zugangsdaten prüfen.', 401);
    }

    $rolle = findeBenutzerRolle($db, $result['username']);

    if ($rolle === null) {
        // Anders als oben: hier DARF die Meldung spezifisch sein. Das
        // Passwort war korrekt, es geht nicht um ein Geheimnis, sondern
        // um eine bewusste Zugriffsbeschränkung, die die Person ruhig
        // verstehen darf.
        protokolliereLoginVersuch($db, $result['username'], false, 'nicht_freigegeben', $ip);
        Response::error(
            'Diese App ist nur für freigegebene Personen (Untis/WebUntis-Team) nutzbar. '
            . 'Bitte eine Admin/einen Admin um Freischaltung bitten.',
            403
        );
    }

    protokolliereLoginVersuch($db, $result['username'], true, null, $ip);

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

function handleMe(PDO $db): void
{
    $user = Guard::requireLogin($db);
    Response::json($user);
}

/**
 * Liest die Rollen-Zeile zu einem WebUntis-Benutzernamen, OHNE sie bei
 * Fehlen automatisch anzulegen (das war das alte Verhalten - siehe Git-
 * Historie). Eine Person muss jetzt VOR ihrem ersten Login von einem
 * Admin in "Zugriff verwalten" eingetragen werden.
 */
function findeBenutzerRolle(PDO $db, string $username): ?array
{
    $stmt = $db->prepare('SELECT anzeigename, rolle FROM benutzer_rollen WHERE webuntis_user = :u');
    $stmt->execute([':u' => $username]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * Ergänzt login_log auch für den Fall "WebUntis-Login korrekt, aber
 * nicht freigegeben" - WebUntisAuth kennt diesen Grund nicht, weil die
 * Freigabe-Prüfung eine Ebene höher (hier) passiert.
 */
function protokolliereLoginVersuch(PDO $db, string $username, bool $erfolgreich, ?string $grund, string $ip): void
{
    $db->prepare(
        'INSERT INTO login_log (webuntis_user, erfolgreich, grund, ip) VALUES (:u, :e, :g, :ip)'
    )->execute([':u' => $username, ':e' => $erfolgreich ? 1 : 0, ':g' => $grund, ':ip' => $ip]);
}

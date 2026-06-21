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
 * Front-Controller: jede Anfrage an die API landet hier (siehe .htaccess)
 * und wird anhand der Routing-Tabelle unten an die passende Funktion aus
 * backend/api/*.php weitergereicht.
 *
 * Bewusst ohne Routing-Bibliothek - bei der Hand voll Endpunkte, die diese
 * App braucht, wäre eine Abhängigkeit dafür unverhältnismäßig.
 */

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use App\Response;

require __DIR__ . '/../api/auth.php';
require __DIR__ . '/../api/dashboard.php';
require __DIR__ . '/../api/schritte.php';
require __DIR__ . '/../api/schuljahre.php';
require __DIR__ . '/../api/rollen.php';
require __DIR__ . '/../api/phasen.php';
require __DIR__ . '/../api/vorlagen.php';
require __DIR__ . '/../api/vorlagen-sets.php';

$route = trim((string) ($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'];

// JSON-Body einmal zentral einlesen, steht damit jedem Handler zur
// Verfügung (bei GET/leerem Body einfach ein leeres Array).
$rawBody = file_get_contents('php://input');
$input = $rawBody ? (json_decode($rawBody, true) ?? []) : [];

// Routing-Tabelle: [HTTP-Methode, Regex auf den Pfad, Handler-Funktion]
// Benannte Gruppen im Regex (?P<id>\d+) werden dem Handler als
// zusätzliches $params-Array übergeben.
$routes = [
    ['POST',  '#^api/login$#',                            'handleLogin'],
    ['POST',  '#^api/logout$#',                            'handleLogout'],
    ['GET',   '#^api/me$#',                                'handleMe'],

    ['GET',   '#^api/dashboard$#',                         'handleDashboard'],

    ['GET',   '#^api/schritte$#',                          'handleListSchritte'],
    ['PATCH', '#^api/schritte/(?P<id>\d+)$#',              'handleUpdateSchritt'],

    ['GET',   '#^api/schuljahre$#',                        'handleListSchuljahre'],
    ['POST',  '#^api/schuljahre$#',                        'handleCreateSchuljahr'],
    ['POST',  '#^api/schuljahre/(?P<id>\d+)/aktivieren$#', 'handleActivateSchuljahr'],

    ['GET',   '#^api/rollen$#',                            'handleListRollen'],
    ['POST',  '#^api/rollen$#',                            'handleUpsertRolle'],
    ['DELETE','#^api/rollen/(?P<user>[^/]+)$#',            'handleDeleteRolle'],

    ['GET',   '#^api/vorlagen$#',                          'handleListVorlagen'],
    ['POST',  '#^api/vorlagen$#',                          'handleCreateVorlage'],
    ['PATCH', '#^api/vorlagen/(?P<id>\d+)$#',              'handleUpdateVorlage'],
    ['POST',  '#^api/vorlagen/reihenfolge$#',              'handleReihenfolgeVorlagen'],

    ['GET',   '#^api/phasen$#',                            'handleListPhasen'],
    ['POST',  '#^api/phasen$#',                            'handleCreatePhase'],
    ['PATCH', '#^api/phasen/(?P<id>\d+)$#',               'handleUpdatePhase'],
    ['POST',  '#^api/phasen/reihenfolge$#',                'handleReihenfolgePhasen'],

    ['GET',   '#^api/vorlagen-sets$#',                     'handleListVorlagenSets'],
    ['POST',  '#^api/vorlagen-sets$#',                     'handleCreateVorlagenSet'],
    ['GET',   '#^api/vorlagen-sets/(?P<id>\d+)$#',         'handleGetVorlagenSet'],
    ['DELETE','#^api/vorlagen-sets/(?P<id>\d+)$#',         'handleDeleteVorlagenSet'],
];

foreach ($routes as [$routeMethod, $pattern, $handler]) {
    if ($method !== $routeMethod || !preg_match($pattern, $route, $matches)) {
        continue;
    }

    // Nur benannte Gruppen (Strings als Schlüssel) als Parameter durchgeben,
    // preg_match liefert zusätzlich die rein numerisch indizierten Treffer.
    $params = array_filter($matches, fn($key) => !is_int($key), ARRAY_FILTER_USE_KEY);

    // PHP ignoriert überzählige Argumente bei einfachen Funktionsaufrufen,
    // daher dürfen Handler auch weniger als 4 Parameter deklarieren.
    $handler($db, $config, $input, $params);
    exit;
}

Response::error("Unbekannte Route: $method /$route", 404);

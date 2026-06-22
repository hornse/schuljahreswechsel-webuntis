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
 * Endpunkte: GET /api/schritte, PATCH /api/schritte/{id}
 */

use App\Guard;
use App\Response;

function handleListSchritte(PDO $db): void
{
    Guard::requireLogin($db);

    $schuljahrId = $_GET['schuljahr_id'] ?? null;
    if ($schuljahrId === null) {
        $schuljahrId = $db->query('SELECT id FROM schuljahre WHERE aktiv = 1 LIMIT 1')->fetchColumn();
    }

    if (!$schuljahrId) {
        Response::json(['schuljahr_id' => null, 'schritte' => []]);
    }

    $stmt = $db->prepare(
        'SELECT si.id, si.erledigt, si.verantwortlich_user, si.verantwortlich_anzeigename,
                si.start_datum, si.geplantes_datum, si.erledigt_am, si.erledigt_von,
                si.kommentar, si.kann_parallel,
                p.name AS phase, p.farbe AS phase_farbe, p.reihenfolge AS phase_reihenfolge,
                sv.reihenfolge, sv.titel, sv.beschreibung
         FROM schritt_instanzen si
         JOIN schritt_vorlagen sv ON sv.id = si.vorlage_id
         JOIN phasen p ON p.id = sv.phase_id
         WHERE si.schuljahr_id = :sj
         ORDER BY p.reihenfolge, sv.reihenfolge'
    );
    $stmt->execute([':sj' => $schuljahrId]);

    Response::json([
        'schuljahr_id' => (int) $schuljahrId,
        'schritte'     => $stmt->fetchAll(),
    ]);
}

function handleUpdateSchritt(PDO $db, array $config, array $input, array $params): void
{
    $user = Guard::requireLogin($db);
    $id = (int) $params['id'];

    $textfelder = ['verantwortlich_user', 'verantwortlich_anzeigename', 'start_datum', 'geplantes_datum', 'kommentar'];
    $sets = [];
    $werte = [':id' => $id];

    foreach ($textfelder as $feld) {
        if (array_key_exists($feld, $input)) {
            $sets[] = "$feld = :$feld";
            $werte[":$feld"] = $input[$feld];
        }
    }

    if (array_key_exists('kann_parallel', $input)) {
        $sets[]                  = 'kann_parallel = :kann_parallel';
        $werte[':kann_parallel'] = $input['kann_parallel'] ? 1 : 0;
    }

    if (array_key_exists('erledigt', $input)) {
        $erledigt = (bool) $input['erledigt'];
        $sets[] = 'erledigt = :erledigt';
        $werte[':erledigt'] = $erledigt ? 1 : 0;

        if ($erledigt) {
            $sets[] = 'erledigt_am = :erledigt_am';
            $sets[] = 'erledigt_von = :erledigt_von';
            $werte[':erledigt_am'] = (new DateTime())->format(DATE_ATOM);
            $werte[':erledigt_von'] = $user['webuntis_user'];
        } else {
            $sets[] = 'erledigt_am = NULL';
            $sets[] = 'erledigt_von = NULL';
        }
    }

    if (empty($sets)) {
        Response::error('Keine gültigen Felder übergeben.', 400);
    }

    $sql = 'UPDATE schritt_instanzen SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $db->prepare($sql)->execute($werte);

    // Aktivität aufzeichnen
    $infoStmt = $db->prepare(
        'SELECT sv.titel, si.schuljahr_id, si.vorlage_id
         FROM schritt_instanzen si JOIN schritt_vorlagen sv ON sv.id = si.vorlage_id
         WHERE si.id = :id'
    );
    $infoStmt->execute([':id' => $id]);
    $info = $infoStmt->fetch();

    if ($info) {
        $ereignisse = [];
        if (array_key_exists('erledigt', $input)) {
            $ereignisse[] = [(bool) $input['erledigt'] ? 'schritt_erledigt' : 'schritt_rueckgaengig', null];
        }
        if (array_key_exists('verantwortlich_anzeigename', $input) && $input['verantwortlich_anzeigename']) {
            $ereignisse[] = ['verantwortlich_gesetzt', $input['verantwortlich_anzeigename']];
        }
        if (array_key_exists('geplantes_datum', $input) && $input['geplantes_datum']) {
            $ereignisse[] = ['datum_gesetzt', $input['geplantes_datum']];
        }
        if (array_key_exists('start_datum', $input) && $input['start_datum']) {
            $ereignisse[] = ['startdatum_gesetzt', $input['start_datum']];
        }
        if (array_key_exists('kommentar', $input) && $input['kommentar']) {
            $ereignisse[] = ['kommentar_gesetzt', null]; // Kommentartext nicht loggen (zu detailliert)
        }

        $logStmt = $db->prepare(
            'INSERT INTO aktivitaeten (schuljahr_id, vorlage_id, schritt_titel, ereignis, wert_neu, benutzer, anzeigename)
             VALUES (:sj, :v, :titel, :ereignis, :wert, :benutzer, :name)'
        );
        foreach ($ereignisse as [$ereignis, $wertNeu]) {
            $logStmt->execute([
                ':sj'      => $info['schuljahr_id'],
                ':v'       => $info['vorlage_id'],
                ':titel'   => $info['titel'],
                ':ereignis' => $ereignis,
                ':wert'    => $wertNeu,
                ':benutzer' => $user['webuntis_user'],
                ':name'    => $user['anzeigename'],
            ]);
        }
    }

    Response::json(['ok' => true]);
}

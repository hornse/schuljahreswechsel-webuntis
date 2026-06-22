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
 * Endpunkt: GET /api/dashboard
 *
 * BEWUSST OHNE LOGIN erreichbar - das ist die öffentliche Status-
 * Ansicht/Landingpage. Liefert deshalb absichtlich nur unkritische
 * Felder: Titel, Phase, Status, geplantes Datum. Kein "Verantwortlich"
 * (das wäre jetzt für jede:n im Internet sichtbar, nicht mehr nur fürs
 * Kollegium) und kein "Kommentar" (Freitext, könnte sensible Dinge
 * enthalten, die jemand im Vertrauen auf ein eingeloggtes Tool
 * eingetragen hat). Die vollständigen Daten gibt es weiterhin nur über
 * GET /api/schritte, das einen Login voraussetzt.
 */

use App\Response;

function handleDashboard(PDO $db): void
{
    $schuljahr = $db->query('SELECT id, label FROM schuljahre WHERE aktiv = 1 LIMIT 1')->fetch();

    if (!$schuljahr) {
        Response::json(['schuljahr_label' => null, 'schritte' => []]);
    }

    $stmt = $db->prepare(
        'SELECT si.erledigt, si.start_datum, si.geplantes_datum, si.kann_parallel,
                p.name AS phase, p.farbe AS phase_farbe, p.reihenfolge AS phase_reihenfolge,
                sv.reihenfolge, sv.titel
         FROM schritt_instanzen si
         JOIN schritt_vorlagen sv ON sv.id = si.vorlage_id
         JOIN phasen p ON p.id = sv.phase_id
         WHERE si.schuljahr_id = :sj
         ORDER BY p.reihenfolge, sv.reihenfolge'
    );
    $stmt->execute([':sj' => $schuljahr['id']]);

    Response::json([
        'schuljahr_label' => $schuljahr['label'],
        'schritte'        => $stmt->fetchAll(),
    ]);
}

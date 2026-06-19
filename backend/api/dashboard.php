<?php

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
        'SELECT si.erledigt, si.geplantes_datum,
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

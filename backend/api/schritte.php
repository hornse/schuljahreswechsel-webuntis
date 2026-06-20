<?php

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
                si.geplantes_datum, si.erledigt_am, si.erledigt_von, si.kommentar,
                si.kann_parallel,
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

    // Nur Text-/Datumsfelder generisch behandeln. "erledigt" braucht
    // Sonderlogik (siehe unten), "schuljahr_id"/"vorlage_id" dürfen über
    // diesen Endpunkt nie verändert werden - deshalb keine generische
    // "alles aus $input übernehmen"-Logik, sondern eine Whitelist.
    $textfelder = ['verantwortlich_user', 'verantwortlich_anzeigename', 'geplantes_datum', 'kommentar'];
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

    Response::json(['ok' => true]);
}

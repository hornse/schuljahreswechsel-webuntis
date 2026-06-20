<?php

/**
 * Endpunkte: GET /api/schuljahre, POST /api/schuljahre,
 *            POST /api/schuljahre/{id}/aktivieren
 */

use App\Guard;
use App\Response;

function handleListSchuljahre(PDO $db): void
{
    Guard::requireLogin($db);
    $rows = $db->query('SELECT id, label, aktiv, erstellt_am FROM schuljahre ORDER BY id DESC')->fetchAll();
    Response::json($rows);
}

/**
 * Legt ein neues Schuljahr an und kopiert die aktuell aktive Schritt-
 * Vorlage dorthin: jede Zeile aus schritt_vorlagen (aktiv = 1) wird zu
 * einer frischen, unerledigten schritt_instanzen-Zeile. Das neue
 * Schuljahr wird automatisch aktiv, alle anderen werden deaktiviert.
 * Nur für Admins, weil das die Arbeitsgrundlage für das ganze Kollegium
 * verändert.
 */
function handleCreateSchuljahr(PDO $db, array $config, array $input): void
{
    Guard::requireAdmin($db);

    $label = trim((string) ($input['label'] ?? ''));
    if ($label === '') {
        Response::error('label ist erforderlich, z. B. "2026/2027".', 400);
    }

    $db->beginTransaction();
    try {
        $db->exec('UPDATE schuljahre SET aktiv = 0');

        $insert = $db->prepare('INSERT INTO schuljahre (label, aktiv) VALUES (:label, 1)');
        $insert->execute([':label' => $label]);
        $schuljahrId = (int) $db->lastInsertId();

        $vorlagen = $db->query('SELECT id, kann_parallel FROM schritt_vorlagen WHERE aktiv = 1')->fetchAll();
        $insertInstanz = $db->prepare(
            'INSERT INTO schritt_instanzen (schuljahr_id, vorlage_id, kann_parallel) VALUES (:sj, :v, :kp)'
        );
        foreach ($vorlagen as $vorlage) {
            $insertInstanz->execute([':sj' => $schuljahrId, ':v' => $vorlage['id'], ':kp' => $vorlage['kann_parallel']]);
        }

        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    Response::json(['id' => $schuljahrId, 'label' => $label], 201);
}

function handleActivateSchuljahr(PDO $db, array $config, array $input, array $params): void
{
    Guard::requireAdmin($db);
    $id = (int) $params['id'];

    $db->beginTransaction();
    $db->exec('UPDATE schuljahre SET aktiv = 0');
    $db->prepare('UPDATE schuljahre SET aktiv = 1 WHERE id = :id')->execute([':id' => $id]);
    $db->commit();

    Response::json(['ok' => true]);
}

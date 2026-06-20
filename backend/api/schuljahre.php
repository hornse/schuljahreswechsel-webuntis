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

    $setId = isset($input['set_id']) ? (int) $input['set_id'] : null;

    $db->beginTransaction();
    try {
        $db->exec('UPDATE schuljahre SET aktiv = 0');

        $insert = $db->prepare('INSERT INTO schuljahre (label, aktiv) VALUES (:label, 1)');
        $insert->execute([':label' => $label]);
        $schuljahrId = (int) $db->lastInsertId();

        if ($setId) {
            // Aus Snapshot: Phasen neu anlegen, Schritte daraus kopieren
            $setPhasen = $db->prepare(
                'SELECT id, name, farbe, reihenfolge FROM vorlagen_set_phasen WHERE set_id = :sid ORDER BY reihenfolge'
            );
            $setPhasen->execute([':sid' => $setId]);
            $phasenAusSet = $setPhasen->fetchAll();

            if (empty($phasenAusSet)) {
                $db->rollBack();
                Response::error('Snapshot nicht gefunden oder leer.', 404);
            }

            // Für jeden Snapshot-Phase eine echte Phase anlegen (oder bestehende
            // wiederverwenden falls Name+Farbe identisch) und Schritte als
            // Vorlagen + Instanzen anlegen.
            $insertPhase  = $db->prepare(
                'INSERT OR IGNORE INTO phasen (name, farbe, reihenfolge) VALUES (:name, :farbe, :r)'
            );
            $findPhase = $db->prepare('SELECT id FROM phasen WHERE name = :name');
            $insertVorlage = $db->prepare(
                'INSERT INTO schritt_vorlagen (phase_id, reihenfolge, titel, beschreibung, kann_parallel)
                 VALUES (:phase_id, :r, :titel, :beschreibung, :kp)'
            );
            $insertInstanz = $db->prepare(
                'INSERT INTO schritt_instanzen (schuljahr_id, vorlage_id, kann_parallel) VALUES (:sj, :v, :kp)'
            );

            foreach ($phasenAusSet as $setPhase) {
                // Phase sicherstellen
                $insertPhase->execute([':name' => $setPhase['name'], ':farbe' => $setPhase['farbe'], ':r' => $setPhase['reihenfolge']]);
                $findPhase->execute([':name' => $setPhase['name']]);
                $phaseId = (int) $findPhase->fetchColumn();

                // Schritte dieser Phase
                $setSchritte = $db->prepare(
                    'SELECT reihenfolge, titel, beschreibung, kann_parallel
                     FROM vorlagen_set_schritte WHERE set_id = :sid AND set_phase_id = :pid ORDER BY reihenfolge'
                );
                $setSchritte->execute([':sid' => $setId, ':pid' => $setPhase['id']]);

                foreach ($setSchritte->fetchAll() as $ss) {
                    $insertVorlage->execute([
                        ':phase_id'    => $phaseId,
                        ':r'           => $ss['reihenfolge'],
                        ':titel'       => $ss['titel'],
                        ':beschreibung' => $ss['beschreibung'],
                        ':kp'          => $ss['kann_parallel'],
                    ]);
                    $vorlageId = (int) $db->lastInsertId();
                    $insertInstanz->execute([':sj' => $schuljahrId, ':v' => $vorlageId, ':kp' => $ss['kann_parallel']]);
                }
            }
        } else {
            // Aus aktiver Vorlage (bisheriges Verhalten)
            $vorlagen = $db->query('SELECT id, kann_parallel FROM schritt_vorlagen WHERE aktiv = 1')->fetchAll();
            $insertInstanz = $db->prepare(
                'INSERT INTO schritt_instanzen (schuljahr_id, vorlage_id, kann_parallel) VALUES (:sj, :v, :kp)'
            );
            foreach ($vorlagen as $vorlage) {
                $insertInstanz->execute([':sj' => $schuljahrId, ':v' => $vorlage['id'], ':kp' => $vorlage['kann_parallel']]);
            }
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

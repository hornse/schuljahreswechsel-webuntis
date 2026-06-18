<?php

namespace App;

use PDO;

/**
 * Zugriffsprüfungen, die mehrere API-Endpunkte brauchen.
 *
 * Wichtig: Rolle und Anzeigename werden bei JEDER Anfrage frisch aus
 * benutzer_rollen gelesen, nicht aus der Session übernommen. Die Session
 * merkt sich nur, WER eingeloggt ist (webuntis_user) - nicht, welche Rolle
 * diese Person hat. Sonst würde eine Rollenänderung (z. B. Beförderung
 * oder Entzug von Admin-Rechten) erst nach erneutem Login wirken, was bei
 * einem Rechte-Entzug ein echtes Sicherheitsproblem wäre, nicht nur eine
 * Unannehmlichkeit.
 */
final class Guard
{
    /** @return array{webuntis_user: string, anzeigename: string, rolle: string} */
    public static function requireLogin(PDO $db): array
    {
        $session = Session::currentUser();
        if ($session === null) {
            Response::error('Nicht angemeldet.', 401);
        }

        $stmt = $db->prepare('SELECT anzeigename, rolle FROM benutzer_rollen WHERE webuntis_user = :u');
        $stmt->execute([':u' => $session['webuntis_user']]);
        $aktuell = $stmt->fetch();

        if ($aktuell === false) {
            // Zeile existiert nicht mehr (z. B. von einem Admin entfernt) -
            // Session entwerten statt mit veralteten Daten weiterzumachen.
            Session::logout();
            Response::error('Nicht angemeldet.', 401);
        }

        return [
            'webuntis_user' => $session['webuntis_user'],
            'anzeigename'   => $aktuell['anzeigename'],
            'rolle'         => $aktuell['rolle'],
        ];
    }

    /** @return array{webuntis_user: string, anzeigename: string, rolle: string} */
    public static function requireAdmin(PDO $db): array
    {
        $user = self::requireLogin($db);
        if ($user['rolle'] !== 'admin') {
            Response::error('Diese Aktion ist nur für Administratoren möglich.', 403);
        }
        return $user;
    }
}

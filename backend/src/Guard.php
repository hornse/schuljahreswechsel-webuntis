<?php

namespace App;

/**
 * Zugriffsprüfungen, die mehrere API-Endpunkte brauchen. Jede Methode
 * beendet die Anfrage selbst (über Response::error) und wird daher immer
 * als erste Zeile in einem Handler aufgerufen, der einen Login bzw.
 * Admin-Rechte voraussetzt.
 */
final class Guard
{
    /** @return array{webuntis_user: string, anzeigename: string, rolle: string} */
    public static function requireLogin(): array
    {
        $user = Session::currentUser();
        if ($user === null) {
            Response::error('Nicht angemeldet.', 401);
        }
        return $user;
    }

    /** @return array{webuntis_user: string, anzeigename: string, rolle: string} */
    public static function requireAdmin(): array
    {
        $user = self::requireLogin();
        if ($user['rolle'] !== 'admin') {
            Response::error('Diese Aktion ist nur für Administratoren möglich.', 403);
        }
        return $user;
    }
}

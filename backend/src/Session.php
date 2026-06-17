<?php

namespace App;

/**
 * Dünner Wrapper um die native PHP-Session. Speichert nach erfolgreichem
 * WebUntis-Login nur das Nötigste - niemals ein Passwort, das kennen wir
 * an dieser Stelle ohnehin nicht mehr (siehe WebUntisAuth).
 */
final class Session
{
    public static function start(array $config): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_name($config['session']['name']);
        session_set_cookie_params([
            'lifetime' => 60 * $config['session']['lifetime_minutes'],
            'path'     => '/',
            'secure'   => true,      // nur über HTTPS - auf Uberspace Standard
            'httponly' => true,      // kein Zugriff aus JavaScript
            'samesite' => 'Lax',     // einfacher CSRF-Basisschutz
        ]);
        session_start();
    }

    public static function login(array $user): void
    {
        // session_regenerate_id verhindert "Session Fixation": eine vor dem
        // Login bekannte Session-ID wird nach dem Login ungültig.
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    /** @return array{webuntis_user: string, anzeigename: string, rolle: string}|null */
    public static function currentUser(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    public static function isAdmin(): bool
    {
        return (self::currentUser()['rolle'] ?? null) === 'admin';
    }
}

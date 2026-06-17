<?php

namespace App;

use PDO;

/**
 * Liefert eine einzelne, fertig konfigurierte PDO-Verbindung zur
 * SQLite-Datenbank. Bewusst eine simple statische Factory statt eines
 * vollen Connection-Pools - für die erwartete Last (paar Dutzend
 * Kollegen, kein Hochfrequenzbetrieb) reicht das locker.
 */
final class Database
{
    private static ?PDO $instance = null;

    public static function connect(array $config): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $path = $config['db']['sqlite_path'];

        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // Ohne das hier vergisst SQLite Fremdschlüssel-Constraints (z. B.
        // ON DELETE CASCADE in schritt_instanzen) standardmäßig.
        $pdo->exec('PRAGMA foreign_keys = ON');

        self::$instance = $pdo;
        return $pdo;
    }
}

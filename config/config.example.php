<?php
/**
 * Beispiel-Konfiguration.
 *
 * Kopiere diese Datei nach config.php und trage die echten Werte ein.
 * config.php ist in .gitignore eingetragen und wird NIE eingecheckt -
 * sie enthält zwar kein Passwort (das speichern wir nie), aber den
 * WebUntis-Servernamen und die Schulkennung, die nicht öffentlich im
 * Repository stehen müssen.
 */

return [

    // Zugangsdaten / Endpunkt für die WebUntis-JSON-RPC-Authentifizierung.
    // Dieselbe Schnittstelle, die auch das MRBS-Auth-Modul der Schule nutzt.
    'webuntis' => [
        'base_url' => 'https://SERVER.webuntis.com',   // ohne Slash am Ende
        'school'   => 'SCHULNAME',                      // wie in der WebUntis-URL
        // Eigener Client-Name, damit sich Anfragen dieser App von denen aus
        // MRBS unterscheiden lassen (rein informativ, kein Geheimnis).
        'client'   => 'SchuljahreswechselApp',
        // Nur diese personType-Werte dürfen sich in dieser App anmelden.
        // 2 = Lehrkraft. (5 = Schüler, andere Werte siehe WebUntis-API-Doku.)
        'allowed_person_types' => [2],
        // Timeouts in Sekunden, damit ein langsames/ausgefallenes WebUntis
        // nicht den PHP-Prozess blockiert.
        'connect_timeout' => 5,
        'timeout'         => 10,
    ],

    // SQLite-Datenbankdatei. Liegt außerhalb von public/, damit sie über
    // den Webserver nicht direkt heruntergeladen werden kann.
    'db' => [
        'sqlite_path' => __DIR__ . '/../data/app.sqlite',
    ],

    'session' => [
        'name'            => 'swj_session',
        'lifetime_minutes' => 480, // 8 Stunden
    ],

    // Einfache Brute-Force-Bremse: ab dieser Anzahl Fehlversuche innerhalb
    // von 15 Minuten wird ein Login für denselben Benutzernamen kurz gesperrt,
    // BEVOR überhaupt eine Anfrage an WebUntis geschickt wird.
    'security' => [
        'max_failed_logins' => 5,
        'lockout_minutes'   => 15,
    ],

];

<?php

declare(strict_types=1);

require __DIR__ . '/includes/functions.php';

$config = require __DIR__ . '/config.php';

// Must run before any output — it may set the language cookie.
$lang = tessel_current_lang($config);
$GLOBALS['translations'] = require __DIR__ . "/lang/{$lang}.php";

$allowedPages = ['home', 'download', 'changelog'];
$page = $_GET['page'] ?? 'home';
if (!in_array($page, $allowedPages, true)) {
    $page = 'home';
}

require __DIR__ . '/includes/header.php';
require __DIR__ . "/pages/{$page}.php";
require __DIR__ . '/includes/footer.php';

<?php
// Othello configuration & session boot.
// IMPORTANT: this file must produce NO output of any kind so that
// session_start() and any later header() calls succeed.

session_name('OTHELLOSESS');
session_start();
ini_set('memory_limit', '256M');

$ini = parse_ini_file(__DIR__ . '/config.ini', true);
if ($ini === false) {
    // Fail loudly only if running interactively; otherwise default.
    $ini = [];
}

$Sitle   = $ini['site']['title']   ?? 'Othello';
$version = $ini['site']['version'] ?? '00000000A';
$favicon = $ini['site']['favicon'] ?? 'favicon.ico';
$today   = date('Ymd');

// Resolve per-server paths
$serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
$pathsKey   = 'paths.' . $serverName;
$pathsCfg   = $ini[$pathsKey] ?? $ini['paths.localhost'] ?? [
    'data_fs'  => 'D:/clarus_data/',
    'data_url' => '/Clarus_Data/',
    'base_url' => '/Othello/',
];

$path    = $pathsCfg['data_fs'];
$dataURL = $pathsCfg['data_url'];
$baseURL = $pathsCfg['base_url'];
$file    = $_SERVER['SCRIPT_NAME'] ?? '/Othello/index.php';

// Default viewer from config.ini, then session is the source of truth.
$viewerDefault = $ini['viewer']['default'] ?? 'pview';
if (!isset($_SESSION['viewer']) || !in_array($_SESSION['viewer'], ['spotlight', 'pview'], true)) {
    $_SESSION['viewer'] = ($viewerDefault === 'spotlight') ? 'spotlight' : 'pview';
}
$viewer = $_SESSION['viewer'];

require_once __DIR__ . '/lib/thumbnail.php';
require_once __DIR__ . '/lib/patient.php';
require_once __DIR__ . '/lib/render.php';

<?php
// Emits the document <head> and opens <body>. Assumes config.php has run.
//
// Cache-bust each static asset by appending its file mtime as a query string.
// The HTML page itself uses Cache-Control: no-cache (below) so the browser
// always re-fetches it, but linked CSS/JS files are cached aggressively by
// Edge — without a version parameter a CSS update can land in the browser
// while the matching JS is still stale, breaking handlers.
function asset($rel) {
    $fs = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $v  = file_exists($fs) ? filemtime($fs) : '0';
    return htmlspecialchars($rel . '?v=' . $v, ENT_QUOTES);
}
?><!doctype html>
<html lang='en'>
<head>
    <meta charset='utf-8'>
    <title><?= htmlspecialchars($Sitle) ?></title>
    <meta name='description' content='<?= htmlspecialchars($Sitle) ?>'>
    <meta name='author' content='Phaethon'>
    <meta http-equiv='Cache-Control' content='no-cache, no-store, must-revalidate'>
    <meta http-equiv='Pragma' content='no-cache'>
    <meta http-equiv='Expires' content='0'>
    <link rel='stylesheet' href='<?= asset('css/styles.css') ?>'>
    <link rel='icon' href='<?= htmlspecialchars($favicon) ?>'>
    <script>
      window.OTHELLO = {
        viewer: <?= json_encode($viewer) ?>,
        idx:    <?= json_encode($_GET['id'] ?? '') ?>
      };
    </script>
    <script defer src='<?= asset('js/PView.js') ?>'></script>
    <script defer src='<?= asset('js/spotlight.bundle.js') ?>'></script>
    <script defer src='<?= asset('js/exam.js') ?>'></script>
    <script defer src='<?= asset('js/search.js') ?>'></script>
    <script defer src='<?= asset('js/viewer-toggle.js') ?>'></script>
</head>
<body>

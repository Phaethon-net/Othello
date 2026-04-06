<?php
// Emits the document <head> and opens <body>. Assumes config.php has run.
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
    <link rel='stylesheet' href='css/styles.css'>
    <link rel='icon' href='<?= htmlspecialchars($favicon) ?>'>
    <script>
      window.OTHELLO = {
        viewer: <?= json_encode($viewer) ?>,
        idx:    <?= json_encode($_GET['id'] ?? '') ?>
      };
    </script>
    <script defer src='js/PView.js'></script>
    <script defer src='js/spotlight.bundle.js'></script>
    <script defer src='js/exam.js'></script>
    <script defer src='js/search.js'></script>
    <script defer src='js/viewer-toggle.js'></script>
</head>
<body>

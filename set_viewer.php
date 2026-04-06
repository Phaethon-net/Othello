<?php
require __DIR__ . '/config.php';

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
$v   = is_array($in) ? ($in['viewer'] ?? '') : '';

if ($v === 'spotlight' || $v === 'pview') {
    $_SESSION['viewer'] = $v;
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'viewer' => $v]);
} else {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'invalid viewer']);
}

<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON body']);
  exit;
}

$error = isset($input['error']) ? (string)$input['error'] : '';
$info = isset($input['info']) ? $input['info'] : null;

$logDir = __DIR__ . '/../storage/logs';
if (!is_dir($logDir)) {
  @mkdir($logDir, 0775, true);
}
$logFile = $logDir . '/client_errors.log';

$entry = [
  'time' => date('c'),
  'error' => $error,
  'info' => $info,
  'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
  'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
];

file_put_contents($logFile, json_encode($entry) . PHP_EOL, FILE_APPEND);

echo json_encode(['ok' => true]);
?>



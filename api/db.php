<?php
// Basic MySQLi connection helper
// Configure via env or fall back to local defaults

header('Content-Type: application/json');

$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';
$db_name = getenv('DB_NAME') ?: 'dental_care_connect';
$db_port = intval(getenv('DB_PORT') ?: 3306);

// Development CORS (adjust/disable in production)
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode([ 'error' => 'Database connection failed', 'details' => $conn->connect_error ]);
  exit;
}

// Ensure UTF-8
$conn->set_charset('utf8mb4');

function respond_json($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

?>



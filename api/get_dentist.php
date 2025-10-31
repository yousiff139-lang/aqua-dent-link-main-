<?php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if (!$id) {
  respond_json([ 'error' => 'Missing dentist id' ], 400);
}

$stmt = $conn->prepare('SELECT * FROM dentists WHERE id = ?');
if (!$stmt) {
  respond_json([ 'error' => 'Failed to prepare statement' ], 500);
}
$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

if (!$row) {
  respond_json([ 'error' => 'Not found' ], 404);
}

// Ensure consistent JSON fields
if (!isset($row['available_slots'])) {
  $row['available_slots'] = null;
}

respond_json($row, 200);
?>



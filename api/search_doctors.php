<?php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

$symptom = isset($_GET['symptom']) ? trim($_GET['symptom']) : '';
if ($symptom === '') {
  respond_json([ 'error' => 'Missing symptom' ], 400);
}

// Use prepared statements with wildcards
$like = '%' . $symptom . '%';
$sql = 'SELECT * FROM dentists WHERE specialty LIKE ? OR bio LIKE ? LIMIT 5';
$stmt = $conn->prepare($sql);
if (!$stmt) {
  respond_json([ 'error' => 'Failed to prepare statement' ], 500);
}
$stmt->bind_param('ss', $like, $like);
$stmt->execute();
$result = $stmt->get_result();

$out = [];
while ($row = $result->fetch_assoc()) {
  $out[] = $row;
}

respond_json($out, 200);
?>



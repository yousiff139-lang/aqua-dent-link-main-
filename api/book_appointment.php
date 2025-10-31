<?php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
  respond_json(['error' => 'Invalid JSON body'], 400);
}

$patient_name = trim($input['name'] ?? '');
$phone_number = trim($input['phone'] ?? '');
$concern = trim($input['concern'] ?? '');
$doctor_id = intval($input['doctor_id'] ?? 0);
$time = trim($input['time'] ?? '');
$payment = trim($input['payment'] ?? 'pending');

if ($patient_name === '' || $phone_number === '' || $doctor_id === 0 || $time === '') {
  respond_json(['error' => 'Missing required fields'], 400);
}

$stmt = $conn->prepare('INSERT INTO appointments (patient_name, phone_number, concern, doctor_id, appointment_time, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)');
if (!$stmt) {
  respond_json(['error' => 'Failed to prepare statement'], 500);
}

$status = 'pending';
$payment_status = $payment === 'paid' ? 'paid' : 'pending';
$stmt->bind_param('sssisss', $patient_name, $phone_number, $concern, $doctor_id, $time, $status, $payment_status);

if (!$stmt->execute()) {
  respond_json(['error' => 'Failed to create appointment'], 500);
}

$inserted_id = $stmt->insert_id;
respond_json(['message' => 'Appointment booked successfully', 'inserted_id' => $inserted_id], 200);
?>



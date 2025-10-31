<?php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

// If Dompdf is not installed, return a clear error
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
  respond_json(['error' => 'PDF library not installed. Run composer install in project root.'], 500);
}

require __DIR__ . '/../vendor/autoload.php';
use Dompdf\Dompdf;

$input = json_decode(file_get_contents('php://input'), true);
$appointment_id = intval($input['appointment_id'] ?? 0);
if (!$appointment_id) {
  respond_json(['error' => 'missing id'], 400);
}

$stmt = $conn->prepare('SELECT a.*, d.name AS dentist_name, d.specialty FROM appointments a LEFT JOIN dentists d ON a.doctor_id = d.id WHERE a.id = ?');
if (!$stmt) {
  respond_json(['error' => 'Failed to prepare statement'], 500);
}
$stmt->bind_param('i', $appointment_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
if (!$row) {
  respond_json(['error' => 'not found'], 404);
}

$html = '<h1>Dental Care Connect Booking</h1>';
$html .= '<p>Patient: ' . htmlspecialchars($row['patient_name']) . '<br/>';
$html .= 'Phone: ' . htmlspecialchars($row['phone_number']) . '<br/>';
$html .= 'Concern: ' . htmlspecialchars($row['concern'] ?? '') . '</p>';
$html .= '<p>Doctor: ' . htmlspecialchars($row['dentist_name'] ?? 'N/A') . ' (' . htmlspecialchars($row['specialty'] ?? 'General') . ')<br/>';
$html .= 'Time: ' . htmlspecialchars($row['appointment_time']) . '</p>';

$dompdf = new Dompdf();
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

$pdfOutput = $dompdf->output();
$dir = __DIR__ . '/../storage/pdfs';
if (!is_dir($dir)) {
  @mkdir($dir, 0775, true);
}
$filename = 'booking_' . $appointment_id . '_' . time() . '.pdf';
$relativePath = 'pdfs/' . $filename;
$fullPath = $dir . '/' . $filename;

if (file_put_contents($fullPath, $pdfOutput) === false) {
  respond_json(['error' => 'Failed to write PDF file'], 500);
}

$stmt2 = $conn->prepare('UPDATE appointments SET pdf_path = ? WHERE id = ?');
$stmt2->bind_param('si', $relativePath, $appointment_id);
$stmt2->execute();

respond_json(['message' => 'pdf generated', 'path' => $relativePath], 200);
?>



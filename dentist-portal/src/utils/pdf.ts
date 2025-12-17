import jsPDF from 'jspdf';
import { Appointment } from '@/types';
import { formatDateTime } from './date';

// Interface for X-ray detection
interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
}

// Interface for diagnostic report
interface DiagnosticReport {
  report: string;
  summary: string;
  recommendations: string[];
  severity_level: string;
}

// Interface for X-ray report data
export interface XRayReportData {
  patientName?: string;
  fileName?: string;
  analysisDate?: Date;
  detections: Detection[];
  diagnosticReport?: DiagnosticReport;
  imageInfo?: {
    width: number;
    height: number;
    format: string;
  };
  metadata?: {
    patient_name?: string;
    patient_id?: string;
    study_date?: string;
    modality?: string;
  };
}

/**
 * Generates a professional PDF report for X-ray analysis results
 */
export const generateXRayReport = (data: XRayReportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPos = 20;

  // Helper function to add a new page if needed
  const checkPageSpace = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper function to wrap text
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, index: number) => {
      checkPageSpace(lineHeight);
      doc.text(line, x, y + (index * lineHeight));
    });
    return y + (lines.length * lineHeight);
  };

  // ===== HEADER =====
  doc.setFillColor(20, 184, 166); // Teal color
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('X-Ray Analysis Report', margin, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Aqua Dent Link - AI-Powered Dental Diagnostics', margin, 28);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 36);

  yPos = 50;
  doc.setTextColor(0, 0, 0);

  // ===== PATIENT/FILE INFORMATION =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (data.patientName) {
    doc.text(`Patient: ${data.patientName}`, margin, yPos);
    yPos += 6;
  }

  if (data.fileName) {
    doc.text(`File: ${data.fileName}`, margin, yPos);
    yPos += 6;
  }

  if (data.analysisDate) {
    doc.text(`Analysis Date: ${data.analysisDate.toLocaleString()}`, margin, yPos);
    yPos += 6;
  }

  // DICOM Metadata if available
  if (data.metadata) {
    if (data.metadata.patient_name) {
      doc.text(`DICOM Patient: ${data.metadata.patient_name}`, margin, yPos);
      yPos += 6;
    }
    if (data.metadata.study_date) {
      doc.text(`Study Date: ${data.metadata.study_date}`, margin, yPos);
      yPos += 6;
    }
    if (data.metadata.modality) {
      doc.text(`Modality: ${data.metadata.modality}`, margin, yPos);
      yPos += 6;
    }
  }

  if (data.imageInfo) {
    doc.text(`Image Dimensions: ${data.imageInfo.width} x ${data.imageInfo.height} px`, margin, yPos);
    yPos += 6;
  }

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ===== DETECTION SUMMARY =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detection Summary', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const detectionCount = data.detections.length;
  const avgConfidence = detectionCount > 0
    ? (data.detections.reduce((sum, d) => sum + d.confidence, 0) / detectionCount * 100).toFixed(1)
    : '0';

  doc.text(`Total Conditions Detected: ${detectionCount}`, margin, yPos);
  yPos += 7;
  doc.text(`Average Confidence: ${avgConfidence}%`, margin, yPos);
  yPos += 10;

  // ===== DETECTED CONDITIONS =====
  if (data.detections.length > 0) {
    checkPageSpace(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detected Conditions', margin, yPos);
    yPos += 8;

    data.detections.forEach((detection, index) => {
      checkPageSpace(25);

      // Condition box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos - 3, pageWidth - (margin * 2), 18, 2, 2, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 184, 166);
      doc.text(`${index + 1}. ${detection.class}`, margin + 5, yPos + 4);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Confidence: ${(detection.confidence * 100).toFixed(1)}%`, margin + 5, yPos + 11);
      doc.text(`Location: (${Math.round(detection.x)}, ${Math.round(detection.y)})`, margin + 70, yPos + 11);
      doc.text(`Size: ${Math.round(detection.width)}×${Math.round(detection.height)}px`, margin + 130, yPos + 11);

      yPos += 22;
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('✓ No dental conditions detected', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }

  yPos += 5;

  // ===== DIAGNOSTIC REPORT =====
  if (data.diagnosticReport) {
    checkPageSpace(40);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Diagnostic Report', margin, yPos);
    yPos += 10;

    // Severity Badge
    const severity = data.diagnosticReport.severity_level || 'unknown';
    let severityColor: [number, number, number] = [128, 128, 128];
    if (severity === 'high') severityColor = [239, 68, 68];
    else if (severity === 'moderate') severityColor = [249, 115, 22];
    else if (severity === 'low') severityColor = [234, 179, 8];

    doc.setFillColor(...severityColor);
    doc.roundedRect(margin, yPos - 4, 50, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`SEVERITY: ${severity.toUpperCase()}`, margin + 3, yPos + 3);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // Summary
    if (data.diagnosticReport.summary) {
      checkPageSpace(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addWrappedText(data.diagnosticReport.summary, margin, yPos, pageWidth - (margin * 2));
      yPos += 8;
    }

    // Detailed Report
    if (data.diagnosticReport.report) {
      checkPageSpace(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Analysis', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = addWrappedText(data.diagnosticReport.report, margin, yPos, pageWidth - (margin * 2));
      yPos += 8;
    }

    // Recommendations
    if (data.diagnosticReport.recommendations && data.diagnosticReport.recommendations.length > 0) {
      checkPageSpace(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      data.diagnosticReport.recommendations.forEach((rec) => {
        checkPageSpace(15);
        doc.setTextColor(20, 184, 166);
        doc.text('•', margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos = addWrappedText(rec, margin + 6, yPos, pageWidth - (margin * 2) - 6);
        yPos += 3;
      });
    }
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      'This report is generated by AI and should be reviewed by a qualified dental professional.',
      margin,
      pageHeight - 15
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 15);
    doc.text('Aqua Dent Link © 2024', pageWidth / 2 - 15, pageHeight - 10);
  }

  // Generate filename and save
  const patientPart = data.patientName ? data.patientName.replace(/\s+/g, '-') : 'patient';
  const datePart = new Date().toISOString().split('T')[0];
  const fileName = `xray-report-${patientPart}-${datePart}.pdf`;

  doc.save(fileName);
};

export const generatePatientReport = (appointment: Appointment, dentistName: string) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Patient Appointment Report', 20, 20);

  // Dentist Info
  doc.setFontSize(12);
  doc.text(`Dentist: ${dentistName}`, 20, 35);
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 42);

  // Line separator
  doc.line(20, 48, 190, 48);

  // Patient Information
  doc.setFontSize(14);
  doc.text('Patient Information', 20, 58);
  doc.setFontSize(11);
  doc.text(`Name: ${appointment.patient_name}`, 20, 68);
  doc.text(`Email: ${appointment.patient_email}`, 20, 75);

  // Appointment Details
  doc.setFontSize(14);
  doc.text('Appointment Details', 20, 90);
  doc.setFontSize(11);
  doc.text(`Date: ${formatDateTime(appointment.appointment_date)}`, 20, 100);
  doc.text(`Type: ${appointment.appointment_type}`, 20, 107);
  doc.text(`Status: ${appointment.status.toUpperCase()}`, 20, 114);

  // Notes
  if (appointment.notes) {
    doc.setFontSize(14);
    doc.text('Dentist Notes', 20, 129);
    doc.setFontSize(11);

    // Split notes into lines to fit page width
    const splitNotes = doc.splitTextToSize(appointment.notes, 170);
    doc.text(splitNotes, 20, 139);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.text('This is a confidential medical document', 20, pageHeight - 20);
  doc.text(`Report ID: ${appointment.id}`, 20, pageHeight - 15);

  // Save the PDF
  const fileName = `patient-report-${appointment.patient_name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
};

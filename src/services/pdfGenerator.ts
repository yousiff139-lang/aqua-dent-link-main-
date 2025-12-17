/**
 * PDF Generator Service for Appointment Summaries
 * Generates PDF summaries for chatbot bookings using jsPDF
 */

import jsPDF from 'jspdf';

export interface AppointmentSummaryData {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  dentistName: string;
  symptoms: string;
  appointmentTime: string;
  appointmentDate: string;
  paymentMethod: 'cash' | 'card';
  bookingReference?: string;
  // Medical Information
  gender?: string;
  isPregnant?: boolean;
  chronicDiseases?: string;
  medicalHistory?: string;
  medications?: string;
  allergies?: string;
  previousDentalWork?: string;
  smoking?: boolean;
  documentUrls?: string[];
}

/**
 * Generate PDF summary for appointment booking
 */
export function generateAppointmentPDF(data: AppointmentSummaryData): Uint8Array {
  const doc = new jsPDF();
  let yPosition = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - (x - margin));
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DentalCareConnect Appointment Summary', margin, yPosition);
  yPosition += lineHeight * 2;

  // Booking Reference
  if (data.bookingReference) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Booking Reference: ${data.bookingReference}`, margin, yPosition);
    yPosition += lineHeight * 1.5;
  }

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight * 1.5;

  // Patient Information Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.patientName}`, margin + 5, yPosition);
  yPosition += lineHeight;

  if (data.patientEmail) {
    doc.text(`Email: ${data.patientEmail}`, margin + 5, yPosition);
    yPosition += lineHeight;
  }

  if (data.patientPhone) {
    doc.text(`Phone: ${data.patientPhone}`, margin + 5, yPosition);
    yPosition += lineHeight;
  }

  // Appointment Details Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Appointment Details', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dentist: ${data.dentistName}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Date: ${data.appointmentDate}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Time: ${data.appointmentTime}`, margin + 5, yPosition);
  yPosition += lineHeight * 1.5;

  // Symptoms Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Symptoms / Concern', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const symptomLines = doc.splitTextToSize(data.symptoms || 'Not specified', contentWidth - 10);
  doc.text(symptomLines, margin + 5, yPosition);
  yPosition += symptomLines.length * lineHeight + lineHeight;

  // Medical Information Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Medical Information', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (data.gender || data.isPregnant !== undefined || data.chronicDiseases) {
    if (data.gender) {
      doc.text(`Gender: ${data.gender.charAt(0).toUpperCase() + data.gender.slice(1)}`, margin + 5, yPosition);
      yPosition += lineHeight;
    }

    if (data.isPregnant !== undefined) {
      doc.text(`Pregnancy Status: ${data.isPregnant ? 'Pregnant' : 'Not Pregnant'}`, margin + 5, yPosition);
      yPosition += lineHeight;
    }

    if (data.chronicDiseases) {
      doc.text('Chronic Diseases:', margin + 5, yPosition);
      yPosition += lineHeight;
      const diseaseLines = doc.splitTextToSize(data.chronicDiseases, contentWidth - 15);
      doc.text(diseaseLines, margin + 10, yPosition);
      yPosition += diseaseLines.length * lineHeight;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('No medical information provided', margin + 5, yPosition);
    yPosition += lineHeight;
  }
  yPosition += lineHeight;

  // Medical History Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Medical History', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let hasAnyMedicalHistory = false;

  if (data.medicalHistory) {
    doc.setFont('helvetica', 'bold');
    doc.text('General History:', margin + 5, yPosition);
    yPosition += lineHeight;
    doc.setFont('helvetica', 'normal');
    const historyLines = doc.splitTextToSize(data.medicalHistory, contentWidth - 15);
    doc.text(historyLines, margin + 10, yPosition);
    yPosition += historyLines.length * lineHeight + lineHeight * 0.5;
    hasAnyMedicalHistory = true;
  }

  if (data.medications) {
    doc.setFont('helvetica', 'bold');
    doc.text('Current Medications:', margin + 5, yPosition);
    yPosition += lineHeight;
    doc.setFont('helvetica', 'normal');
    const medLines = doc.splitTextToSize(data.medications, contentWidth - 15);
    doc.text(medLines, margin + 10, yPosition);
    yPosition += medLines.length * lineHeight + lineHeight * 0.5;
    hasAnyMedicalHistory = true;
  }

  if (data.allergies) {
    doc.setFont('helvetica', 'bold');
    doc.text('Allergies:', margin + 5, yPosition);
    yPosition += lineHeight;
    doc.setFont('helvetica', 'normal');
    const allergyLines = doc.splitTextToSize(data.allergies, contentWidth - 15);
    doc.text(allergyLines, margin + 10, yPosition);
    yPosition += allergyLines.length * lineHeight + lineHeight * 0.5;
    hasAnyMedicalHistory = true;
  }

  if (data.previousDentalWork) {
    doc.setFont('helvetica', 'bold');
    doc.text('Previous Dental Work:', margin + 5, yPosition);
    yPosition += lineHeight;
    doc.setFont('helvetica', 'normal');
    const dentalLines = doc.splitTextToSize(data.previousDentalWork, contentWidth - 15);
    doc.text(dentalLines, margin + 10, yPosition);
    yPosition += dentalLines.length * lineHeight + lineHeight * 0.5;
    hasAnyMedicalHistory = true;
  }

  if (data.smoking !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Smoking:', margin + 5, yPosition);
    yPosition += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text(data.smoking ? 'Yes' : 'No', margin + 10, yPosition);
    yPosition += lineHeight + lineHeight * 0.5;
    hasAnyMedicalHistory = true;
  }

  if (!hasAnyMedicalHistory) {
    doc.setFont('helvetica', 'italic');
    doc.text('No medical history provided', margin + 5, yPosition);
    yPosition += lineHeight;
  }
  yPosition += lineHeight;

  // Uploaded Documents Section
  if (data.documentUrls && data.documentUrls.length > 0) {
    checkNewPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Uploaded Documents', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.documentUrls.length} document(s) uploaded:`, margin + 5, yPosition);
    yPosition += lineHeight;

    data.documentUrls.forEach((url, index) => {
      checkNewPage(10);
      const fileName = url.split('/').pop() || `Document ${index + 1}`;
      doc.setTextColor(0, 0, 255); // Blue for links
      doc.textWithLink(`${index + 1}. ${fileName}`, margin + 10, yPosition, { url });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += lineHeight;
    });
    yPosition += lineHeight;
  }

  // Payment Information Section
  checkNewPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Information', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method: ${data.paymentMethod.toUpperCase()}`, margin + 5, yPosition);
  yPosition += lineHeight * 2;

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This document was generated automatically by DentalCareConnect', margin, pageHeight - 15);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 10);

  // Return PDF as Uint8Array
  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}

/**
 * Convert PDF to Blob for Supabase Storage upload
 */
export function pdfToBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}


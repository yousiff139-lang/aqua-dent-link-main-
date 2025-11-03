/**
 * PDF Generator Service for Appointment Summaries
 * Generates PDF summaries for chatbot bookings using jsPDF
 */

import jsPDF from 'jspdf';

export interface AppointmentSummaryData {
  patientName: string;
  dentistName: string;
  symptoms: string;
  appointmentTime: string;
  appointmentDate: string;
  paymentMethod: 'cash' | 'card';
  bookingReference?: string;
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
  return new Blob([pdfBytes], { type: 'application/pdf' });
}


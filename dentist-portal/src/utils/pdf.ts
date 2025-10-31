import jsPDF from 'jspdf';
import { Appointment } from '@/types';
import { formatDateTime } from './date';

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

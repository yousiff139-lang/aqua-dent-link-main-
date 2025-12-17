/**
 * PDF Generator Service for Appointment Summaries
 * Generates PDF summaries matching the chatbot's format using jsPDF
 */

import jsPDF from 'jspdf';

export interface AppointmentPDFData {
    patientName: string;
    patientEmail?: string;
    patientPhone?: string;
    dentistName?: string;
    symptoms?: string;
    appointmentTime: string;
    appointmentDate: string;
    paymentMethod?: string;
    paymentStatus?: string;
    bookingReference?: string;
    notes?: string;
    // Medical Information
    gender?: string;
    isPregnant?: boolean;
    chronicDiseases?: string;
    medicalHistory?: string;
    documentUrls?: string[];
    documentNames?: string[];
}

/**
 * Generate PDF summary for appointment - EXACT same format as chatbot
 */
export function generateAppointmentPDF(data: AppointmentPDFData): jsPDF {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

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
    doc.text(`Dentist: ${data.dentistName || 'Assigned Dentist'}`, margin + 5, yPosition);
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
            const diseaseLines = doc.splitTextToSize(`Chronic Diseases: ${data.chronicDiseases}`, contentWidth - 10);
            doc.text(diseaseLines, margin + 5, yPosition);
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

    if (data.medicalHistory) {
        const historyLines = doc.splitTextToSize(data.medicalHistory, contentWidth - 10);
        doc.text(historyLines, margin + 5, yPosition);
        yPosition += historyLines.length * lineHeight + lineHeight;
    } else {
        doc.setFont('helvetica', 'italic');
        doc.text('No medical history provided', margin + 5, yPosition);
        yPosition += lineHeight * 2;
    }

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
            const fileName = data.documentNames?.[index] || url.split('/').pop() || `Document ${index + 1}`;
            doc.setTextColor(139, 69, 19); // Brown color like chatbot
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
    doc.text(`Payment Method: ${(data.paymentMethod || 'CASH').toUpperCase()}`, margin + 5, yPosition);
    yPosition += lineHeight * 2;

    // Dentist Notes (if any)
    if (data.notes) {
        checkNewPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Dentist Notes', margin, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(data.notes, contentWidth - 10);
        doc.text(notesLines, margin + 5, yPosition);
        yPosition += notesLines.length * lineHeight + lineHeight;
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('This document was generated automatically by DentalCareConnect', margin, pageHeight - 15);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 10);

    return doc;
}

/**
 * Download PDF directly
 */
export function downloadAppointmentPDF(data: AppointmentPDFData, filename?: string): void {
    const doc = generateAppointmentPDF(data);
    doc.save(filename || `appointment_${data.bookingReference || 'summary'}.pdf`);
}

/**
 * Open PDF in new tab for preview
 */
export function previewAppointmentPDF(data: AppointmentPDFData): void {
    const doc = generateAppointmentPDF(data);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
}

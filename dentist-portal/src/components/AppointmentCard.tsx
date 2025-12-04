import { Appointment, AppointmentStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, CreditCard, CheckCircle, CalendarClock, Mail, Phone, FileText, FileImage, Download, X } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';

import { PrivateNotes } from './PrivateNotes';

interface AppointmentCardProps {
  appointment: Appointment;
  onMarkComplete: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onViewXray?: (appointment: Appointment) => void;
  onUpdateNotes?: (appointmentId: string, notes: string) => Promise<void>;
  isProcessing?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onMarkComplete,
  onReschedule,
  onCancel,
  onViewXray,
  onUpdateNotes,
  isProcessing = false,
}: AppointmentCardProps) => {
  // Get status badge variant
  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      upcoming: { variant: 'default', label: 'Upcoming' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    return variants[status] ?? { variant: 'outline', label: status };
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; color: string }> = {
      pending: { variant: 'secondary', label: 'Pending', color: 'text-yellow-600' },
      paid: { variant: 'default', label: 'Paid', color: 'text-green-600' },
      failed: { variant: 'destructive', label: 'Failed', color: 'text-red-600' },
    };
    return variants[paymentStatus] || { variant: 'outline', label: paymentStatus, color: 'text-gray-600' };
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Format time
  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Check if appointment is in the future
  const isAppointmentFuture = () => {
    try {
      const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      return isFuture(appointmentDate);
    } catch {
      return false;
    }
  };

  const statusBadge = getStatusBadge(appointment.status);
  const paymentBadge = getPaymentStatusBadge(appointment.payment_status);
  const isFutureAppointment = isAppointmentFuture();
  const showCompleteButton = appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'upcoming';
  const canClickComplete = showCompleteButton && !isFutureAppointment;
  const canReschedule = appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const isCompleted = appointment.status === 'completed';

  return (
    <Card
      className={`
        transition-all duration-200 hover:shadow-md
        ${isCompleted ? 'bg-muted/30 border-muted' : 'hover:border-primary/50'}
      `}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header: Status and Payment */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant} className="text-sm">
                {statusBadge.label}
              </Badge>
              {isCompleted && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className={`h-4 w-4 ${paymentBadge.color}`} />
              <Badge variant={paymentBadge.variant} className="text-xs">
                {paymentBadge.label}
              </Badge>
            </div>
          </div>

          {/* Patient Information - Prominent */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-2">{appointment.patient_name}</h3>
                <div className="space-y-1">
                  <a
                    href={`mailto:${appointment.patient_email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    title={`Email ${appointment.patient_email}`}
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate group-hover:underline">{appointment.patient_email}</span>
                  </a>
                  {appointment.patient_phone && (
                    <a
                      href={`tel:${appointment.patient_phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                      title={`Call ${appointment.patient_phone}`}
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="group-hover:underline">{formatPhoneNumber(appointment.patient_phone)}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(appointment.appointment_time)}</p>
              </div>
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Reason for Visit</p>
              <p className="text-sm">{appointment.reason}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-medium capitalize">{appointment.payment_method}</span>
            {appointment.payment_method === 'cash' && appointment.payment_status === 'pending' && (
              <Badge variant="outline" className="text-xs ml-2">
                Pay at appointment
              </Badge>
            )}
          </div>

          {/* Notes Section */}
          <div className="border-t pt-4 mt-4">
            <PrivateNotes
              appointmentId={appointment.id}
              initialNotes={appointment.notes || ''}
              onSave={onUpdateNotes || (async () => { })}
            />
          </div>

          {/* View X-Rays Button - Shows if appointment has X-rays */}
          {onViewXray && (
            <div className="border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewXray(appointment)}
                className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-300"
              >
                <FileImage className="h-4 w-4 mr-2" />
                View X-Rays & Analysis
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {showCompleteButton && (
              <Button
                size="sm"
                onClick={() => onMarkComplete(appointment)}
                disabled={!canClickComplete || isProcessing}
                className={`flex-1 transition-all ${canClickComplete
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                  : 'opacity-50 cursor-not-allowed'
                  }`}
                title={isFutureAppointment ? 'Available after appointment time' : 'Mark as completed'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {canClickComplete ? 'Mark Complete' : 'Locked Until Time'}
              </Button>
            )}
            {canReschedule && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReschedule(appointment)}
                disabled={isProcessing}
                className="flex-1 transition-all hover:scale-105"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
            {canReschedule && onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(appointment)}
                disabled={isProcessing}
                className="flex-1 transition-all hover:scale-105 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            {/* Always show PDF download button */}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                // Generate and download PDF with appointment details
                const apt = appointment as any; // Cast to access all fields

                // Fetch health info and documents from database
                try {
                  const { createClient } = await import('@supabase/supabase-js');
                  const supabase = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY
                  );

                  // Fetch health information and documents from appointment_medical_info
                  const { data: medicalInfo } = await supabase
                    .from('appointment_medical_info')
                    .select('*')
                    .eq('appointment_id', apt.id)
                    .single();

                  // Use medical info as health info and extract documents
                  const healthInfo = medicalInfo;
                  const documents = medicalInfo?.documents || [];

                  // Create a printable window
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Appointment - ${apt.patient_name}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
                            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                            h2 { color: #374151; margin-top: 30px; margin-bottom: 15px; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
                            .label { font-weight: bold; color: #374151; }
                            .value { margin-left: 10px; color: #1f2937; }
                            .empty { font-style: italic; color: #9ca3af; }
                            .doc-link { color: #2563eb; text-decoration: none; display: block; margin: 5px 0; }
                            .doc-link:hover { text-decoration: underline; }
                            @media print { button { display: none; } }
                          </style>
                        </head>
                        <body>
                          <h1>Appointment Summary</h1>
                          
                          <div class="section">
                            <h2>Patient Information</h2>
                            <p><span class="label">Name:</span><span class="value">${apt.patient_name}</span></p>
                            <p><span class="label">Email:</span><span class="value">${apt.patient_email}</span></p>
                            <p><span class="label">Phone:</span><span class="value">${apt.patient_phone || 'N/A'}</span></p>
                          </div>
                          
                          <div class="section">
                            <h2>Appointment Details</h2>
                            <p><span class="label">Date:</span><span class="value">${formatDate(apt.appointment_date)}</span></p>
                            <p><span class="label">Time:</span><span class="value">${formatTime(apt.appointment_time)}</span></p>
                            <p><span class="label">Status:</span><span class="value">${apt.status}</span></p>
                          </div>
                          
                          <div class="section">
                            <h2>Symptoms / Chief Complaint</h2>
                            <p><span class="value">${apt.reason || apt.symptoms || 'Not specified'}</span></p>
                          </div>
                          
                          <div class="section">
                            <h2>Medical Information</h2>
                            <p><span class="label">Patient Name:</span><span class="value">${apt.patient_name}</span></p>
                            ${(() => {
                        // Try to get from healthInfo table first
                        if (healthInfo) {
                          let output = '';
                          if (healthInfo.gender) {
                            output += `<p><span class="label">Gender:</span><span class="value">${healthInfo.gender.charAt(0).toUpperCase() + healthInfo.gender.slice(1)}</span></p>`;
                          }
                          if (healthInfo.is_pregnant !== null && healthInfo.is_pregnant !== undefined) {
                            output += `<p><span class="label">Pregnancy Status:</span><span class="value">${healthInfo.is_pregnant ? 'Pregnant' : 'Not Pregnant'}</span></p>`;
                          }
                          if (healthInfo.chronic_diseases) {
                            output += `<p><span class="label">Chronic Diseases:</span><br/><span class="value">${healthInfo.chronic_diseases}</span></p>`;
                          }
                          return output || '<p class="empty">No additional medical information</p>';
                        }

                        // Fallback: Parse from medical_history field
                        const medHistory = apt.medical_history || '';
                        let output = '';

                        // Extract gender
                        const genderMatch = medHistory.match(/Gender:\s*(\w+)/i);
                        if (genderMatch) {
                          const gender = genderMatch[1];
                          output += `<p><span class="label">Gender:</span><span class="value">${gender.charAt(0).toUpperCase() + gender.slice(1)}</span></p>`;
                        }

                        // Extract pregnancy
                        const pregnantMatch = medHistory.match(/Pregnant:\s*(Yes|No)/i);
                        if (pregnantMatch) {
                          output += `<p><span class="label">Pregnancy Status:</span><span class="value">${pregnantMatch[1]}</span></p>`;
                        }

                        // Extract chronic diseases
                        const chronicMatch = medHistory.match(/Chronic Diseases:\s*([^|\n]+)/i);
                        if (chronicMatch) {
                          output += `<p><span class="label">Chronic Diseases:</span><br/><span class="value">${chronicMatch[1].trim()}</span></p>`;
                        }

                        return output || '<p class="empty">No additional medical information</p>';
                      })()}
                          </div>
                          
                          <div class="section">
                            <h2>Medical History</h2>
                            ${(() => {
                        // Try healthInfo first
                        if (healthInfo?.medical_history) {
                          return `<p><span class="value">${healthInfo.medical_history}</span></p>`;
                        }

                        // Parse medical_history to extract actual history (not gender/pregnancy)
                        const medHistory = apt.medical_history || '';

                        // Remove the structured data (Gender, Pregnant, Chronic Diseases)
                        let cleanHistory = medHistory
                          .replace(/Gender:\s*\w+\s*\|?/gi, '')
                          .replace(/Pregnant:\s*(Yes|No)\s*\|?/gi, '')
                          .replace(/Chronic Diseases:\s*[^|\n]+\s*\|?/gi, '')
                          .replace(/Medical History:\s*/gi, '')
                          .trim();

                        // Remove leading/trailing pipes
                        cleanHistory = cleanHistory.replace(/^\|\s*|\s*\|$/g, '').trim();

                        if (cleanHistory) {
                          return `<p><span class="value">${cleanHistory}</span></p>`;
                        }

                        // Check if there are documents
                        if (documents && documents.length > 0) {
                          return '<p class="empty">Patient uploaded documentation (see below)</p>';
                        }

                        return '<p class="empty">Nothing was provided</p>';
                      })()}
                          </div>
                          
                          ${documents && documents.length > 0 ? `
                            <div class="section">
                              <h2>Uploaded Documents</h2>
                              <p><span class="label">${documents.length} document(s) uploaded:</span></p>
                              ${documents.map((doc: any, index: number) => `
                                <a href="${doc.file_url}" target="_blank" class="doc-link">
                                  ${index + 1}. ${doc.file_name} (${doc.file_type.toUpperCase()})
                                </a>
                              `).join('')}
                            </div>
                          ` : ''}
                          
                          <div class="section">
                            <h2>Payment</h2>
                            <p><span class="label">Method:</span><span class="value">${apt.payment_method}</span></p>
                            <p><span class="label">Status:</span><span class="value">${apt.payment_status}</span></p>
                          </div>
                          
                          <div class="section">
                            <h2>Dentist Notes</h2>
                            <p>${apt.notes || '<span class="empty">No notes yet</span>'}</p>
                          </div>
                          
                          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">Print/Save as PDF</button>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  alert('Failed to generate PDF. Please try again.');
                }
              }}
              className="flex-1 transition-all hover:scale-105"
              title="Download appointment details as PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {appointment.pdf_report_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(appointment.pdf_report_url, '_blank')}
                className="flex-1 transition-all hover:scale-105"
                title="Download PDF Report"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Report
              </Button>
            )}
            {!showCompleteButton && !canReschedule && !appointment.pdf_report_url && (
              <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                No actions available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

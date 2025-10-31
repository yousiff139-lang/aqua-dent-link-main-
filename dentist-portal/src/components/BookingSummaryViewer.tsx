import { Appointment, DocumentReference } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  Download,
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PrivateNotes } from './PrivateNotes';

interface BookingSummaryViewerProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: 'dialog' | 'sheet';
  onSaveNotes?: (appointmentId: string, notes: string) => Promise<void>;
}

export const BookingSummaryViewer = ({
  appointment,
  open,
  onOpenChange,
  variant = 'sheet',
  onSaveNotes,
}: BookingSummaryViewerProps) => {
  if (!appointment) return null;

  const handleSaveNotes = async (notes: string) => {
    if (onSaveNotes) {
      await onSaveNotes(appointment.id, notes);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM dd, yyyy');
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

  // Get status badge
  const getStatusBadge = () => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    return variants[appointment.status] || { variant: 'outline', label: appointment.status };
  };

  const statusBadge = getStatusBadge();
  const hasUncertainty = appointment.cause_identified === false && appointment.uncertainty_note;
  const hasDocuments = appointment.documents && appointment.documents.length > 0;

  // Download document
  const handleDownloadDocument = (doc: DocumentReference) => {
    window.open(doc.fileUrl, '_blank');
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const content = (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge variant={statusBadge.variant} className="text-sm">
          {statusBadge.label}
        </Badge>
        {appointment.booking_reference && (
          <div className="text-sm text-muted-foreground">
            Ref: <span className="font-mono font-semibold">{appointment.booking_reference}</span>
          </div>
        )}
      </div>

      {/* Uncertainty Warning */}
      {hasUncertainty && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Uncertain Diagnosis
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {appointment.uncertainty_note}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                The patient was unsure about the exact cause. Professional diagnosis recommended.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Information */}
      <div>
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <User className="h-5 w-5" />
          Patient Information
        </h3>
        <div className="space-y-2 bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{appointment.patient_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${appointment.patient_email}`}
              className="text-primary hover:underline"
            >
              {appointment.patient_email}
            </a>
          </div>
          {appointment.patient_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${appointment.patient_phone}`}
                className="text-primary hover:underline"
              >
                {appointment.patient_phone}
              </a>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Appointment Details */}
      <div>
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Appointment Details
        </h3>
        <div className="space-y-2 bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(appointment.appointment_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(appointment.appointment_time)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Chief Complaint / Symptoms */}
      <div>
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Chief Complaint
        </h3>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm whitespace-pre-wrap">
            {appointment.chief_complaint || appointment.symptoms || appointment.reason}
          </p>
        </div>
      </div>

      {/* Medical History */}
      {appointment.medical_history && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Medical History
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{appointment.medical_history}</p>
            </div>
          </div>
        </>
      )}

      {/* Documents */}
      {hasDocuments && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Documents ({appointment.documents!.length})
            </h3>
            <div className="space-y-2">
              {appointment.documents!.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType} • {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc)}
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Booking Summary PDF */}
      {appointment.booking_summary_url && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Documents
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(appointment.booking_summary_url, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Booking Summary (PDF)
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
              {appointment.excel_sheet_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(appointment.excel_sheet_url, '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Excel Sheet
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Patient Notes */}
      {appointment.patient_notes && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3">Patient Notes</h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{appointment.patient_notes}</p>
            </div>
          </div>
        </>
      )}

      {/* Cancellation Info */}
      {appointment.status === 'cancelled' && appointment.cancellation_reason && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-3 text-destructive">
              Cancellation Information
            </h3>
            <div className="bg-destructive/10 rounded-lg p-4">
              <p className="text-sm">{appointment.cancellation_reason}</p>
              {appointment.cancelled_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Cancelled on {format(parseISO(appointment.cancelled_at), 'PPpp')}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Private Notes */}
      {onSaveNotes && (
        <>
          <Separator />
          <PrivateNotes
            appointmentId={appointment.id}
            initialNotes={appointment.notes}
            updatedAt={appointment.updated_at}
            onSave={handleSaveNotes}
          />
        </>
      )}
    </div>
  );

  if (variant === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Summary</DialogTitle>
            <DialogDescription>
              Complete appointment details for {appointment.patient_name}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Booking Summary</SheetTitle>
          <SheetDescription>
            Complete appointment details for {appointment.patient_name}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">{content}</div>
      </SheetContent>
    </Sheet>
  );
};

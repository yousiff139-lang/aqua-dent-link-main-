import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EnhancedBookingForm } from "@/components/EnhancedBookingForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistId: string;
  dentistName: string;
  dentistEmail: string;
  onSuccess?: (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => void;
}

export function BookingModal({
  open,
  onOpenChange,
  dentistId,
  dentistName,
  dentistEmail,
  onSuccess,
}: BookingModalProps) {
  const handleSuccess = (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => {
    if (onSuccess) {
      onSuccess(data);
    }
    // Close modal after successful booking (unless it's Stripe payment which redirects)
    if (data.paymentMethod === "cash") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment with {dentistName}</DialogTitle>
          <DialogDescription>
            Fill out the form below to schedule your dental appointment. All medical information is kept confidential.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ErrorBoundary>
            <EnhancedBookingForm
              dentistId={dentistId}
              dentistName={dentistName}
              dentistEmail={dentistEmail}
              onSuccess={handleSuccess}
            />
          </ErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}








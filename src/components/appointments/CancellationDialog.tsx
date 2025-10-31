import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  appointmentDetails?: {
    dentistName: string;
    date: string;
    time: string;
  };
  isLoading?: boolean;
}

export const CancellationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  appointmentDetails,
  isLoading = false,
}: CancellationDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason(""); // Reset for next time
  };

  const handleCancel = () => {
    setReason(""); // Reset on cancel
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Cancel Appointment
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {appointmentDetails && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground mb-1">
                  {appointmentDetails.dentistName}
                </p>
                <p className="text-muted-foreground">
                  {appointmentDetails.date} at {appointmentDetails.time}
                </p>
              </div>
            )}
            
            <p className="text-foreground">
              Are you sure you want to cancel this appointment?
            </p>
            
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Cancellation Policy:</strong> Appointments cannot be cancelled within 1 hour of the scheduled time.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="cancellation-reason" className="text-sm">
            Reason for cancellation (optional)
          </Label>
          <Textarea
            id="cancellation-reason"
            placeholder="Please let us know why you're cancelling..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Keep Appointment
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancelling..." : "Cancel Appointment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

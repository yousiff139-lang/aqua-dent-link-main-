import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Appointment } from '@/types';
import { Calendar, Clock } from 'lucide-react';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onConfirm: (date: string, time: string) => void;
  isLoading?: boolean;
}

export const RescheduleDialog = ({
  open,
  onOpenChange,
  appointment,
  onConfirm,
  isLoading = false,
}: RescheduleDialogProps) => {
  const [date, setDate] = useState(appointment?.appointment_date || '');
  const [time, setTime] = useState(appointment?.appointment_time || '');
  const [error, setError] = useState('');

  // Reset form when appointment changes
  useState(() => {
    if (appointment) {
      setDate(appointment.appointment_date);
      setTime(appointment.appointment_time);
      setError('');
    }
  });

  const handleConfirm = async () => {
    // Validate date is not in the past
    const selectedDate = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (selectedDate < now) {
      setError('Cannot schedule appointments in the past');
      return;
    }

    if (!date || !time) {
      setError('Please select both date and time');
      return;
    }

    setError('');
    
    try {
      await onConfirm(date, time);
    } catch (err: any) {
      // Handle slot unavailable error
      if (err?.response?.status === 409) {
        if (err?.response?.data?.error?.details?.alternativeSlots) {
          const alternatives = err.response.data.error.details.alternativeSlots;
          const alternativeTimesText = alternatives
            .slice(0, 3)
            .map((slot: { time: string }) => {
              const displayTime = new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              return displayTime;
            })
            .join(", ");
          
          setError(`This time slot is already booked. Available times: ${alternativeTimesText}${alternatives.length > 3 ? " and more" : ""}`);
        } else {
          setError('This time slot is already booked. Please select a different time.');
        }
      } else if (err?.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reschedule appointment. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setError('');
    onOpenChange(false);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for {appointment?.patient_name}'s appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current appointment info */}
          <div className="bg-muted p-3 rounded-md space-y-1">
            <p className="text-sm font-medium">Current Appointment</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{appointment?.appointment_date}</span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{appointment?.appointment_time}</span>
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="date">New Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              disabled={isLoading}
            />
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label htmlFor="time">New Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

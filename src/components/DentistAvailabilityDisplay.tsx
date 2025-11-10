import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { 
  useDentistAvailability, 
  getDayName, 
  formatTime,
  type DentistAvailability 
} from "@/hooks/useDentistAvailability";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DentistAvailabilityDisplayProps {
  dentistId: string;
}

export function DentistAvailabilityDisplay({ dentistId }: DentistAvailabilityDisplayProps) {
  const { data: availability, isLoading, error } = useDentistAvailability(dentistId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Availability Schedule
        </h3>
        <LoadingSpinner size="sm" text="Loading availability..." />
      </Card>
    );
  }

  if (error) {
    console.error('Error loading availability:', error);
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Availability Schedule
        </h3>
        <div className="flex items-start gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            Unable to load availability schedule. Please contact the dentist directly for appointment times.
          </p>
        </div>
      </Card>
    );
  }

  if (!availability || availability.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Availability Schedule
        </h3>
        <div className="flex items-start gap-3 text-muted-foreground">
          <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium mb-1">Contact dentist for availability</p>
            <p className="text-xs">
              This dentist's schedule is not currently available online. 
              Please use the booking form below and the dentist will confirm your appointment.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Group availability by day of week
  const groupedByDay = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, DentistAvailability[]>);

  // Sort days (0-6) - Database convention: 0=Monday, 1=Tuesday, ..., 6=Sunday
  // Already in correct order (Mon-Fri for our seed data 0-4)
  const sortedDays = Object.keys(groupedByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Availability Schedule
      </h3>
      <div className="space-y-3">
        {sortedDays.map(dayNum => {
          const daySlots = groupedByDay[dayNum];
          return (
            <div key={dayNum} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0">
              <Badge variant="outline" className="min-w-[90px] justify-center">
                {getDayName(dayNum)}
              </Badge>
              <div className="flex-1 space-y-1">
                {daySlots.map((slot, idx) => (
                  <div key={slot.id || idx} className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                    {slot.slot_duration_minutes && (
                      <span className="text-xs text-muted-foreground">
                        ({slot.slot_duration_minutes} min slots)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
        * Actual availability may vary. Booked time slots will be disabled in the booking form.
      </p>
    </Card>
  );
}

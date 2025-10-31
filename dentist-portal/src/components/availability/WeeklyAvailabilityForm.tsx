import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface DayAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_available: boolean;
}

interface WeeklyAvailabilityFormProps {
  dentistId: string;
  onSave: (availability: DayAvailability[]) => Promise<void>;
  initialData?: DayAvailability[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const WeeklyAvailabilityForm = ({
  dentistId,
  onSave,
  initialData = [],
}: WeeklyAvailabilityFormProps) => {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData.length > 0) {
      setAvailability(initialData);
    } else {
      // Initialize with default availability (Monday-Friday, 9 AM - 5 PM)
      const defaultAvailability = DAYS_OF_WEEK.slice(1, 6).map((day) => ({
        day_of_week: day.value,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
        is_available: true,
      }));
      setAvailability(defaultAvailability);
    }
  }, [initialData]);

  const handleDayToggle = (dayOfWeek: number, enabled: boolean) => {
    if (enabled) {
      // Add day with default times
      const newDay: DayAvailability = {
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
        is_available: true,
      };
      setAvailability([...availability, newDay].sort((a, b) => a.day_of_week - b.day_of_week));
    } else {
      // Remove day
      setAvailability(availability.filter((a) => a.day_of_week !== dayOfWeek));
    }
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setAvailability(
      availability.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a
      )
    );
  };

  const handleSlotDurationChange = (dayOfWeek: number, value: number) => {
    setAvailability(
      availability.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, slot_duration_minutes: value } : a
      )
    );
  };

  const validateAvailability = (): boolean => {
    for (const day of availability) {
      if (!day.start_time || !day.end_time) {
        toast.error(`Please set both start and end times for ${DAYS_OF_WEEK[day.day_of_week].label}`);
        return false;
      }

      if (day.start_time >= day.end_time) {
        toast.error(`End time must be after start time for ${DAYS_OF_WEEK[day.day_of_week].label}`);
        return false;
      }

      if (day.slot_duration_minutes < 5 || day.slot_duration_minutes > 240) {
        toast.error(`Slot duration must be between 5 and 240 minutes for ${DAYS_OF_WEEK[day.day_of_week].label}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateAvailability()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(availability);
      toast.success('Availability updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
    } finally {
      setIsSaving(false);
    }
  };

  const getDayAvailability = (dayOfWeek: number): DayAvailability | undefined => {
    return availability.find((a) => a.day_of_week === dayOfWeek);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability Schedule</CardTitle>
        <CardDescription>
          Set your available hours for each day of the week. Patients will be able to book
          appointments during these times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS_OF_WEEK.map((day) => {
          const dayAvail = getDayAvailability(day.value);
          const isEnabled = !!dayAvail;

          return (
            <div key={day.value} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleDayToggle(day.value, checked)}
                  />
                  <Label className="text-base font-medium">{day.label}</Label>
                </div>
              </div>

              {isEnabled && dayAvail && (
                <div className="ml-11 grid gap-4 md:grid-cols-3 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor={`start-${day.value}`} className="text-sm">
                      Start Time
                    </Label>
                    <Input
                      id={`start-${day.value}`}
                      type="time"
                      value={dayAvail.start_time}
                      onChange={(e) =>
                        handleTimeChange(day.value, 'start_time', e.target.value)
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`end-${day.value}`} className="text-sm">
                      End Time
                    </Label>
                    <Input
                      id={`end-${day.value}`}
                      type="time"
                      value={dayAvail.end_time}
                      onChange={(e) =>
                        handleTimeChange(day.value, 'end_time', e.target.value)
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`duration-${day.value}`} className="text-sm">
                      Slot Duration (minutes)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`duration-${day.value}`}
                        type="number"
                        min="5"
                        max="240"
                        step="5"
                        value={dayAvail.slot_duration_minutes}
                        onChange={(e) =>
                          handleSlotDurationChange(day.value, parseInt(e.target.value, 10))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving || availability.length === 0}
            className="min-w-32"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Availability'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyAvailabilityForm;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchDentistAvailability, 
  addAvailability, 
  deleteAvailability,
  updateAvailability 
} from "@/lib/admin-queries";
import { DentistAvailability } from "@/types/admin";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Calendar,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface AvailabilityManagerProps {
  dentistId: string;
  onUpdate?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const AvailabilityManager = ({ dentistId, onUpdate }: AvailabilityManagerProps) => {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<DentistAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    loadAvailability();
  }, [dentistId]);

  const loadAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDentistAvailability(dentistId);
      setAvailability(data);
    } catch (err: any) {
      console.error('Error loading availability:', err);
      setError(err.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (endTime <= startTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await addAvailability({
        dentist_id: dentistId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: true,
      });

      toast({
        title: "Success",
        description: "Availability slot added successfully",
      });

      // Reset form
      setShowAddForm(false);
      setDayOfWeek(1);
      setStartTime("09:00");
      setEndTime("17:00");

      // Reload availability
      await loadAvailability();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error adding availability:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to add availability slot",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      setIsSubmitting(true);
      
      await deleteAvailability(slotId);

      toast({
        title: "Success",
        description: "Availability slot deleted successfully",
      });

      // Reload availability
      await loadAvailability();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error deleting availability:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete availability slot",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setDeleteSlotId(null);
    }
  };

  const handleToggleAvailability = async (slot: DentistAvailability) => {
    try {
      await updateAvailability(slot.id, {
        is_available: !slot.is_available,
      });

      toast({
        title: "Success",
        description: `Slot ${slot.is_available ? 'disabled' : 'enabled'} successfully`,
      });

      // Reload availability
      await loadAvailability();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error toggling availability:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  // Group availability by day of week
  const groupedAvailability = availability.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, DentistAvailability[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Availability</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadAvailability} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Weekly Schedule</h3>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant={showAddForm ? "outline" : "default"}
        >
          {showAddForm ? (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Slot
            </>
          )}
        </Button>
      </div>

      {/* Add Slot Form */}
      {showAddForm && (
        <Card className="p-4 bg-muted/50">
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Availability Slot
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Availability Schedule */}
      {availability.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Availability Set</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add availability slots to define when this dentist is available for appointments.
          </p>
          <Button onClick={() => setShowAddForm(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add First Slot
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const slots = groupedAvailability[day.value] || [];
            if (slots.length === 0) return null;

            return (
              <Card key={day.value} className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {day.label}
                </h4>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        <Badge
                          variant={slot.is_available ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {slot.is_available ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Available
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Unavailable
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAvailability(slot)}
                          disabled={isSubmitting}
                        >
                          {slot.is_available ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteSlotId(slot.id)}
                          disabled={isSubmitting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSlotId} onOpenChange={() => setDeleteSlotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability Slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this availability slot. Any appointments scheduled
              during this time will not be affected, but new bookings will not be allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSlotId && handleDeleteSlot(deleteSlotId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

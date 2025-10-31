import { useState } from 'react';
import { AvailabilitySlot } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface TimeSlotEditorProps {
  slot: AvailabilitySlot | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (slot: AvailabilitySlot) => Promise<void>;
}

const TimeSlotEditor = ({ slot, isOpen, onClose, onSave }: TimeSlotEditorProps) => {
  const [startTime, setStartTime] = useState(slot?.start_time || '');
  const [endTime, setEndTime] = useState(slot?.end_time || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!slot || !startTime || !endTime) return;

    setIsLoading(true);
    try {
      await onSave({
        ...slot,
        start_time: startTime,
        end_time: endTime,
      });
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Time Slot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={startTime ? new Date(startTime).toISOString().slice(0, 16) : ''}
              onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <Input
              id="end-time"
              type="datetime-local"
              value={endTime ? new Date(endTime).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEndTime(new Date(e.target.value).toISOString())}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimeSlotEditor;

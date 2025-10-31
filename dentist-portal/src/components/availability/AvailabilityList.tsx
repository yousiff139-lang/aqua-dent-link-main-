import { AvailabilitySlot } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/utils/date';
import { Calendar, Clock, Edit } from 'lucide-react';

interface AvailabilityListProps {
  slots: AvailabilitySlot[];
  onEdit: (slot: AvailabilitySlot) => void;
}

const AvailabilityList = ({ slots, onEdit }: AvailabilityListProps) => {
  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No availability slots configured</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add your available times to let patients book appointments
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {slots.map((slot) => (
        <Card key={slot.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Time Slot</CardTitle>
              <Badge variant={slot.is_available ? 'default' : 'secondary'}>
                {slot.is_available ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(slot.start_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onEdit(slot)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AvailabilityList;

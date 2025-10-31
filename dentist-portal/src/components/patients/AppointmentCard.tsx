import { useState } from 'react';
import { Appointment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/utils/date';
import { Calendar, Mail, CheckCircle, FileText, Download, Save } from 'lucide-react';
import { generatePatientReport } from '@/utils/pdf';

interface AppointmentCardProps {
  appointment: Appointment;
  dentistName: string;
  onMarkCompleted: (id: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
}

const AppointmentCard = ({ appointment, dentistName, onMarkCompleted, onUpdateNotes }: AppointmentCardProps) => {
  const [notes, setNotes] = useState(appointment.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleSaveNotes = async () => {
    if (notes === appointment.notes) return;
    
    setIsSaving(true);
    try {
      await onUpdateNotes(appointment.id, notes);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    setIsMarking(true);
    try {
      await onMarkCompleted(appointment.id);
    } finally {
      setIsMarking(false);
    }
  };

  const handleExportPDF = () => {
    generatePatientReport(appointment, dentistName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{appointment.patient_name}</CardTitle>
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Appointment Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateTime(appointment.appointment_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{appointment.patient_email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{appointment.appointment_type}</span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this appointment..."
            className="min-h-[100px]"
          />
          {notes !== appointment.notes && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Notes'}
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {appointment.status === 'pending' && (
            <Button
              size="sm"
              onClick={handleMarkCompleted}
              disabled={isMarking}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isMarking ? 'Marking...' : 'Mark Completed'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;

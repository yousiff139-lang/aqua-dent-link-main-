import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Edit2, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PrivateNotesProps {
  appointmentId: string;
  initialNotes?: string;
  updatedAt?: string;
  onSave: (notes: string) => Promise<void>;
}

export const PrivateNotes = ({
  appointmentId,
  initialNotes = '',
  updatedAt,
  onSave,
}: PrivateNotesProps) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setHasChanges(false);
    setIsEditing(false);
  }, [appointmentId, initialNotes]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== initialNotes);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Saving notes...');

    try {
      await onSave(notes);
      toast.success('Notes saved successfully', { id: loadingToast });
      setIsEditing(false);
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Private Notes</CardTitle>
            <CardDescription>
              Add private notes about this appointment (visible only to you)
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Enter your private notes here..."
              className="min-h-[150px] resize-y"
              disabled={isSaving}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {hasChanges && 'You have unsaved changes'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {notes ? (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No notes added yet</p>
                <p className="text-xs mt-1">Click "Edit" to add private notes</p>
              </div>
            )}
            {updatedAt && notes && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last updated: {format(new Date(updatedAt), 'PPpp')}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

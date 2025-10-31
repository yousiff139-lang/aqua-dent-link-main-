import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from '@/services/notificationService';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getUserNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await updateNotificationPreferences(preferences);
      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Failed to load preferences</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Manage how you receive notifications about appointments and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* In-App Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications within the application
              </p>
            </div>
            <Switch
              id="in-app"
              checked={preferences.in_app_notifications}
              onCheckedChange={(checked) => updatePreference('in_app_notifications', checked)}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-4">Email Notifications</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-all">Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all email notifications
                </p>
              </div>
              <Switch
                id="email-all"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              />
            </div>

            {preferences.email_notifications && (
              <>
                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <Label htmlFor="booking-confirmation">Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when appointments are confirmed
                    </p>
                  </div>
                  <Switch
                    id="booking-confirmation"
                    checked={preferences.booking_confirmation_email}
                    onCheckedChange={(checked) => updatePreference('booking_confirmation_email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-booking">New Booking Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when new appointments are booked (for dentists)
                    </p>
                  </div>
                  <Switch
                    id="new-booking"
                    checked={preferences.new_booking_email}
                    onCheckedChange={(checked) => updatePreference('new_booking_email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <Label htmlFor="cancellation">Cancellation Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when appointments are cancelled
                    </p>
                  </div>
                  <Switch
                    id="cancellation"
                    checked={preferences.cancellation_email}
                    onCheckedChange={(checked) => updatePreference('cancellation_email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <Label htmlFor="reminder">Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminder emails before appointments
                    </p>
                  </div>
                  <Switch
                    id="reminder"
                    checked={preferences.reminder_email}
                    onCheckedChange={(checked) => updatePreference('reminder_email', checked)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

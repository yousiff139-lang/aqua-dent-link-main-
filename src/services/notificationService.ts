import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'booking_confirmation' | 'new_booking' | 'appointment_cancelled' | 'appointment_reminder' | 'system';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  booking_confirmation_email: boolean;
  new_booking_email: boolean;
  cancellation_email: boolean;
  reminder_email: boolean;
  in_app_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Send booking confirmation notification to patient
 */
export async function sendBookingConfirmation(appointmentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'booking_confirmation',
        appointmentId
      }
    });

    if (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
    throw error;
  }
}

/**
 * Send new booking alert to dentist
 */
export async function sendNewBookingAlert(appointmentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'new_booking_alert',
        appointmentId
      }
    });

    if (error) {
      console.error('Error sending new booking alert:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send new booking alert:', error);
    throw error;
  }
}

/**
 * Send cancellation notification to both patient and dentist
 */
export async function sendCancellationNotification(appointmentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'cancellation_notification',
        appointmentId
      }
    });

    if (error) {
      console.error('Error sending cancellation notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send cancellation notification:', error);
    throw error;
  }
}

/**
 * Get all notifications for the current user
 */
export async function getUserNotifications(limit: number = 50): Promise<Notification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data as Notification[];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no preferences exist, return default preferences
      if (error.code === 'PGRST116') {
        return {
          user_id: user.id,
          email_notifications: true,
          booking_confirmation_email: true,
          new_booking_email: true,
          cancellation_email: true,
          reminder_email: true,
          in_app_notifications: true
        };
      }
      console.error('Error fetching notification preferences:', error);
      throw error;
    }

    return data as NotificationPreferences;
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    throw error;
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if preferences exist
    const { data: existingPrefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let result;

    if (existingPrefs) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(preferences)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
      }

      result = data;
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: user.id,
          ...preferences
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification preferences:', error);
        throw error;
      }

      result = data;
    }

    return result as NotificationPreferences;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Utility functions for appointment management
 */

/**
 * Check if an appointment can be cancelled based on the 1-hour policy
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM format)
 * @returns boolean - True if appointment can be cancelled, false otherwise
 */
export function canCancelAppointment(
  appointmentDate: string,
  appointmentTime: string
): boolean {
  try {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursDifference > 1;
  } catch (error) {
    console.error('Error checking cancellation eligibility:', error);
    return false;
  }
}

/**
 * Get the time remaining until an appointment
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM format)
 * @returns Object with hours and minutes remaining
 */
export function getTimeUntilAppointment(
  appointmentDate: string,
  appointmentTime: string
): { hours: number; minutes: number; isPast: boolean } {
  try {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return { hours: 0, minutes: 0, isPast: true };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, isPast: false };
  } catch (error) {
    console.error('Error calculating time until appointment:', error);
    return { hours: 0, minutes: 0, isPast: false };
  }
}

/**
 * Format appointment date and time for display
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM format)
 * @returns Object with formatted date and time strings
 */
export function formatAppointmentDateTime(
  appointmentDate: string,
  appointmentTime: string
): { date: string; time: string; dateTime: string } {
  try {
    const dateObj = new Date(`${appointmentDate}T${appointmentTime}`);
    
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      dateTime: dateObj.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    };
  } catch (error) {
    console.error('Error formatting appointment date/time:', error);
    return {
      date: appointmentDate,
      time: appointmentTime,
      dateTime: `${appointmentDate} ${appointmentTime}`,
    };
  }
}

/**
 * Check if an appointment is upcoming (in the future and not cancelled)
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM format)
 * @param status - The appointment status
 * @returns boolean - True if appointment is upcoming
 */
export function isUpcomingAppointment(
  appointmentDate: string,
  appointmentTime: string,
  status: string
): boolean {
  if (status !== 'upcoming') return false;
  
  try {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    return appointmentDateTime.getTime() > now.getTime();
  } catch (error) {
    console.error('Error checking if appointment is upcoming:', error);
    return false;
  }
}

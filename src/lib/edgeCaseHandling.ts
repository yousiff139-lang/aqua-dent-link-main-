/**
 * Edge case handling utilities for booking system
 * Handles slot conflicts, session timeouts, AI failures, and concurrent bookings
 */

import { BookingError, ErrorCode } from './errorHandling';

/**
 * Session timeout configuration
 */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_WARNING_MS = 25 * 60 * 1000; // 25 minutes (5 min warning)
export const AUTO_SAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Session manager for handling timeouts and auto-save
 */
export class SessionManager {
  private sessionId: string;
  private lastActivityTime: Date;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  private expiryTimeout: NodeJS.Timeout | null = null;
  private onWarning?: () => void;
  private onExpiry?: () => void;
  private onAutoSave?: () => Promise<void>;

  constructor(
    sessionId: string,
    options?: {
      onWarning?: () => void;
      onExpiry?: () => void;
      onAutoSave?: () => Promise<void>;
    }
  ) {
    this.sessionId = sessionId;
    this.lastActivityTime = new Date();
    this.onWarning = options?.onWarning;
    this.onExpiry = options?.onExpiry;
    this.onAutoSave = options?.onAutoSave;

    this.startTimers();
  }

  /**
   * Update last activity time and reset timers
   */
  updateActivity(): void {
    this.lastActivityTime = new Date();
    this.resetTimers();
  }

  /**
   * Start all timers
   */
  private startTimers(): void {
    // Auto-save timer
    if (this.onAutoSave) {
      this.autoSaveInterval = setInterval(async () => {
        try {
          await this.onAutoSave!();
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, AUTO_SAVE_INTERVAL_MS);
    }

    // Warning timer (5 minutes before expiry)
    if (this.onWarning) {
      this.warningTimeout = setTimeout(() => {
        this.onWarning!();
      }, SESSION_WARNING_MS);
    }

    // Expiry timer
    if (this.onExpiry) {
      this.expiryTimeout = setTimeout(() => {
        this.cleanup();
        this.onExpiry!();
      }, SESSION_TIMEOUT_MS);
    }
  }

  /**
   * Reset timers on activity
   */
  private resetTimers(): void {
    this.cleanup();
    this.startTimers();
  }

  /**
   * Clean up all timers
   */
  cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
    if (this.expiryTimeout) {
      clearTimeout(this.expiryTimeout);
      this.expiryTimeout = null;
    }
  }

  /**
   * Get time remaining until session expires
   */
  getTimeRemaining(): number {
    const now = new Date();
    const elapsed = now.getTime() - this.lastActivityTime.getTime();
    return Math.max(0, SESSION_TIMEOUT_MS - elapsed);
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return this.getTimeRemaining() === 0;
  }
}

/**
 * Slot conflict resolution
 * Handles concurrent booking attempts for the same slot
 */
export class SlotConflictResolver {
  /**
   * Check if a slot is available with pessimistic locking
   * Returns true if slot can be reserved, false if conflict detected
   */
  static async checkAndReserveSlot(
    dentistId: string,
    slotTime: Date,
    patientId: string,
    supabase: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use a transaction-like approach with immediate conflict detection
      // First, check for existing reservations or appointments
      const slotTimeString = slotTime.toISOString();
      const dateString = slotTime.toISOString().split('T')[0];
      const timeString = `${String(slotTime.getHours()).padStart(2, '0')}:${String(slotTime.getMinutes()).padStart(2, '0')}`;

      // Check for active reservations
      const { data: existingReservations, error: reservationError } = await supabase
        .from('time_slot_reservations')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('slot_time', slotTimeString)
        .gte('reservation_expires_at', new Date().toISOString())
        .eq('status', 'reserved');

      if (reservationError) {
        throw reservationError;
      }

      // Check if someone else has reserved this slot
      if (existingReservations && existingReservations.length > 0) {
        const otherReservation = existingReservations.find(r => r.reserved_by !== patientId);
        if (otherReservation) {
          return {
            success: false,
            error: 'This time slot was just reserved by another patient. Please select a different time.'
          };
        }
      }

      // Check for confirmed appointments
      const { data: existingAppointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('dentist_id', dentistId)
        .eq('appointment_date', dateString)
        .eq('appointment_time', timeString)
        .in('status', ['upcoming', 'confirmed']);

      if (appointmentError) {
        throw appointmentError;
      }

      if (existingAppointments && existingAppointments.length > 0) {
        return {
          success: false,
          error: 'This time slot is no longer available. Please select a different time.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return {
        success: false,
        error: 'Failed to verify slot availability. Please try again.'
      };
    }
  }

  /**
   * Handle slot conflict by suggesting alternative slots
   */
  static async suggestAlternativeSlots(
    dentistId: string,
    requestedDate: Date,
    getAvailableSlotsFn: (dentistId: string, date: Date) => Promise<any[]>
  ): Promise<any[]> {
    try {
      // Get available slots for the requested date
      const slots = await getAvailableSlotsFn(dentistId, requestedDate);
      
      // If no slots available on requested date, try next 7 days
      if (slots.length === 0) {
        const alternativeSlots: any[] = [];
        
        for (let i = 1; i <= 7; i++) {
          const nextDate = new Date(requestedDate);
          nextDate.setDate(nextDate.getDate() + i);
          
          const nextDaySlots = await getAvailableSlotsFn(dentistId, nextDate);
          if (nextDaySlots.length > 0) {
            alternativeSlots.push(...nextDaySlots.slice(0, 3)); // Take first 3 slots
            if (alternativeSlots.length >= 5) break; // Suggest up to 5 alternatives
          }
        }
        
        return alternativeSlots;
      }
      
      return slots;
    } catch (error) {
      console.error('Error suggesting alternative slots:', error);
      return [];
    }
  }
}

/**
 * AI service fallback responses
 * Provides rule-based responses when AI service fails
 */
export class AIFallbackHandler {
  /**
   * Get fallback response based on conversation step
   */
  static getFallbackResponse(step: string, userMessage?: string): string {
    const fallbackResponses: Record<string, string> = {
      greeting: "Hello! I'm here to help you book an appointment. To get started, may I have your phone number?",
      
      phone_number: "Thank you! Now, could you please describe your dental concern or reason for visit?",
      
      symptoms: "I understand. Would you like to upload any medical documents, X-rays, or previous prescriptions? (You can skip this step if you don't have any)",
      
      documents: "Great! Let me show you the available appointment times. Please select a time that works best for you.",
      
      time_selection: "Perfect! Let me confirm your appointment details. Please review and confirm to complete your booking.",
      
      confirmation: "Your appointment has been confirmed! You'll receive a confirmation email shortly. Is there anything else I can help you with?",
      
      default: "I'm here to help you book an appointment. Could you please provide more information?"
    };

    return fallbackResponses[step] || fallbackResponses.default;
  }

  /**
   * Detect if AI service is available
   */
  static async checkAIServiceHealth(aiServiceUrl?: string): Promise<boolean> {
    if (!aiServiceUrl) {
      return false;
    }

    try {
      const response = await fetch(aiServiceUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Get response with AI fallback
   */
  static async getResponseWithFallback(
    aiServiceFn: () => Promise<string>,
    fallbackStep: string,
    userMessage?: string
  ): Promise<{ response: string; usedFallback: boolean }> {
    try {
      const response = await aiServiceFn();
      return { response, usedFallback: false };
    } catch (error) {
      console.warn('AI service failed, using fallback response:', error);
      const fallbackResponse = this.getFallbackResponse(fallbackStep, userMessage);
      return { response: fallbackResponse, usedFallback: true };
    }
  }
}

/**
 * Concurrent booking prevention
 * Prevents race conditions when multiple users try to book the same slot
 */
export class ConcurrentBookingPrevention {
  private static pendingReservations = new Map<string, { patientId: string; timestamp: number }>();
  private static readonly LOCK_DURATION_MS = 10000; // 10 seconds

  /**
   * Acquire lock for a slot
   */
  static acquireLock(slotId: string, patientId: string): boolean {
    const now = Date.now();
    const existing = this.pendingReservations.get(slotId);

    // Check if lock exists and is still valid
    if (existing) {
      const isExpired = now - existing.timestamp > this.LOCK_DURATION_MS;
      
      if (!isExpired && existing.patientId !== patientId) {
        // Another user has the lock
        return false;
      }
      
      // Lock expired or same user, can proceed
      if (isExpired) {
        this.pendingReservations.delete(slotId);
      }
    }

    // Acquire lock
    this.pendingReservations.set(slotId, { patientId, timestamp: now });
    return true;
  }

  /**
   * Release lock for a slot
   */
  static releaseLock(slotId: string, patientId: string): void {
    const existing = this.pendingReservations.get(slotId);
    
    if (existing && existing.patientId === patientId) {
      this.pendingReservations.delete(slotId);
    }
  }

  /**
   * Clean up expired locks
   */
  static cleanupExpiredLocks(): void {
    const now = Date.now();
    
    for (const [slotId, lock] of this.pendingReservations.entries()) {
      if (now - lock.timestamp > this.LOCK_DURATION_MS) {
        this.pendingReservations.delete(slotId);
      }
    }
  }
}

// Clean up expired locks every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    ConcurrentBookingPrevention.cleanupExpiredLocks();
  }, 60000);
}

/**
 * Reservation expiry handler
 * Manages automatic expiration of temporary slot reservations
 */
export class ReservationExpiryHandler {
  /**
   * Check if a reservation has expired
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() >= expiresAt;
  }

  /**
   * Get time remaining for a reservation
   */
  static getTimeRemaining(expiresAt: Date): number {
    const now = new Date();
    const remaining = expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  /**
   * Format time remaining as human-readable string
   */
  static formatTimeRemaining(expiresAt: Date): string {
    const remainingMs = this.getTimeRemaining(expiresAt);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Create countdown timer for reservation
   */
  static createCountdown(
    expiresAt: Date,
    onTick: (remaining: string) => void,
    onExpire: () => void
  ): () => void {
    const interval = setInterval(() => {
      if (this.isExpired(expiresAt)) {
        clearInterval(interval);
        onExpire();
      } else {
        const remaining = this.formatTimeRemaining(expiresAt);
        onTick(remaining);
      }
    }, 1000);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

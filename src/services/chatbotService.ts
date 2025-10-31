/**
 * Chatbot Service for DentalCareConnect
 * Handles conversation flow, intent detection, and appointment booking
 * Now includes real-time availability synchronization
 */

import { supabase } from '@/integrations/supabase/client';
import { chatbotRealtimeSync } from '@/services/chatbotRealtimeSync';
import {
  ChatSession,
  ConversationState,
  UserIntent,
  ChatbotResponse,
  Dentist,
  DentalSpecialization,
  SYMPTOM_SPECIALIZATION_MAP,
  INTENT_KEYWORDS,
} from '@/types/chatbot';

/**
 * In-memory session storage
 * In production, consider using Redis or Supabase table
 */
const activeSessions = new Map<string, ChatSession>();

/**
 * ChatbotService Class
 * Main service for handling chatbot interactions
 */
export class ChatbotService {
  /**
   * Start a new conversation session
   * Automatically fetches patient data from Supabase for personalized greeting
   * @param userId - The user's ID
   * @returns Welcome message with personalized greeting
   */
  async startConversation(userId: string): Promise<ChatbotResponse> {
    // Fetch patient data from Supabase
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', userId)
      .single();

    // Extract first name for personalized greeting
    const firstName = patient?.full_name?.split(' ')[0] || 'there';
    
    // Create new session with pre-filled patient data
    const session: ChatSession = {
      userId,
      currentState: ConversationState.GREETING,
      context: {
        patientName: patient?.full_name,
        patientEmail: patient?.email,
        patientPhone: patient?.phone,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    activeSessions.set(userId, session);

    // Personalized greeting with patient's first name
    const greeting = patient?.full_name 
      ? `Hi ${firstName}! Welcome back to DentalCareConnect 👋`
      : `Hi! Welcome to DentalCareConnect 👋`;

    return {
      message: `${greeting}\n\nI'm your virtual dental assistant. How can I help you today?\n\n• Book an appointment\n• Ask about a dental issue\n• Check existing appointment`,
      state: ConversationState.AWAITING_INTENT,
      options: ['Book Appointment', 'Ask Question', 'Check Appointment'],
      requiresInput: true,
    };
  }

  /**
   * Handle user input and progress conversation
   * @param userId - The user's ID
   * @param message - User's message
   * @returns Chatbot response
   */
  async handleUserInput(userId: string, message: string): Promise<ChatbotResponse> {
    // Get or create session
    let session = activeSessions.get(userId);
    
    if (!session) {
      return await this.startConversation(userId);
    }

    session.updatedAt = new Date();

    // Process based on current state
    let response: ChatbotResponse;

    switch (session.currentState) {
      case ConversationState.GREETING:
      case ConversationState.AWAITING_INTENT:
        response = await this.handleIntentDetection(session, message);
        break;

      case ConversationState.AWAITING_NAME:
        response = await this.handleNameInput(session, message);
        break;

      case ConversationState.AWAITING_EMAIL:
        response = await this.handleEmailInput(session, message);
        break;

      case ConversationState.AWAITING_PHONE:
        response = await this.handlePhoneInput(session, message);
        break;

      case ConversationState.AWAITING_SYMPTOM:
        response = await this.handleSymptomInput(session, message);
        break;

      case ConversationState.AWAITING_DENTIST_CONFIRMATION:
        response = await this.handleDentistConfirmation(session, message);
        break;

      case ConversationState.AWAITING_DATE_TIME:
        response = await this.handleDateTimeSelection(session, message);
        break;

      case ConversationState.AWAITING_FINAL_CONFIRMATION:
        response = await this.handleFinalConfirmation(session, message);
        break;

      default:
        response = {
          message: "I'm sorry, something went wrong. Let's start over.",
          state: ConversationState.GREETING,
          requiresInput: true,
        };
        session.currentState = ConversationState.GREETING;
    }

    session.currentState = response.state;
    activeSessions.set(userId, session);

    return response;
  }

  /**
   * Handle intent detection and route to appropriate flow
   * Skips name/email collection if already in session context
   */
  private async handleIntentDetection(
    session: ChatSession,
    message: string
  ): Promise<ChatbotResponse> {
    const intent = this.detectIntent(message);
    session.context.intent = intent;

    switch (intent) {
      case UserIntent.BOOK_APPOINTMENT:
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return {
            message: "To book an appointment, please sign in first.",
            state: ConversationState.ERROR,
            requiresInput: true,
          };
        }

        // Check if patient data already exists in session context
        if (!session.context.patientName || !session.context.patientEmail) {
          // Fetch from database if not in session
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', user.id)
            .single();

          if (profile) {
            session.context.patientName = profile.full_name;
            session.context.patientEmail = profile.email;
            session.context.patientPhone = profile.phone;
          }
        }

        // Skip name/email collection - go straight to symptom
        if (session.context.patientName && session.context.patientEmail) {
          const firstName = session.context.patientName.split(' ')[0];
          return {
            message: `Perfect, ${firstName}! I have your details on file.\n\nNow, could you describe your dental concern or symptom?\n\nFor example:\n• Tooth pain\n• Gum bleeding\n• Need braces\n• Wisdom teeth removal`,
            state: ConversationState.AWAITING_SYMPTOM,
            requiresInput: true,
          };
        }

        // Fallback: ask for name only if not in database
        return {
          message: "Great! Let's book your appointment. First, what's your full name?",
          state: ConversationState.AWAITING_NAME,
          requiresInput: true,
        };

      case UserIntent.CHECK_APPOINTMENT:
        return await this.checkUserAppointments(session);

      case UserIntent.ASK_QUESTION:
        return {
          message: "I'd be happy to help! What would you like to know about dental care?",
          state: ConversationState.AWAITING_INTENT,
          requiresInput: true,
        };

      default:
        return {
          message: "I'm not sure I understood that. Would you like to:\n\n• Book an appointment\n• Ask a question\n• Check your appointments",
          state: ConversationState.AWAITING_INTENT,
          options: ['Book Appointment', 'Ask Question', 'Check Appointment'],
          requiresInput: true,
        };
    }
  }

  private async handleNameInput(session: ChatSession, message: string): Promise<ChatbotResponse> {
    session.context.patientName = message.trim();
    return {
      message: `Nice to meet you, ${message}! What's your email address?`,
      state: ConversationState.AWAITING_EMAIL,
      requiresInput: true,
    };
  }

  private async handleEmailInput(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const email = message.trim();
    if (!this.isValidEmail(email)) {
      return {
        message: "That doesn't look like a valid email. Please enter a valid email address:",
        state: ConversationState.AWAITING_EMAIL,
        requiresInput: true,
      };
    }
    session.context.patientEmail = email;
    return {
      message: "Great! And your phone number?",
      state: ConversationState.AWAITING_PHONE,
      requiresInput: true,
    };
  }

  private async handlePhoneInput(session: ChatSession, message: string): Promise<ChatbotResponse> {
    session.context.patientPhone = message.trim();
    return {
      message: "Perfect! Now, could you describe your dental concern or symptom?",
      state: ConversationState.AWAITING_SYMPTOM,
      requiresInput: true,
    };
  }

  private async handleSymptomInput(session: ChatSession, message: string): Promise<ChatbotResponse> {
    session.context.symptom = message;
    const specialization = this.detectSpecialization(message);
    session.context.specialization = specialization;

    const dentist = await this.suggestDentist(specialization);

    if (!dentist) {
      return {
        message: `I understand you're experiencing ${message}. Unfortunately, we don't have any ${specialization} available right now.`,
        state: ConversationState.ERROR,
        requiresInput: true,
      };
    }

    session.context.suggestedDentist = dentist;
    const nextSlot = dentist.availability.find(slot => slot.available);
    const slotInfo = nextSlot ? `${nextSlot.date} at ${nextSlot.time}` : 'soon';

    return {
      message: `Got it! ${message} usually requires a ${specialization}.\n\n✨ I found:\n\n👨‍⚕️ **${dentist.name}**\n⭐ Rating: ${dentist.rating}/5.0\n📅 Available: ${slotInfo}\n\nWould you like me to book this appointment?`,
      state: ConversationState.AWAITING_DENTIST_CONFIRMATION,
      suggestedDentist: dentist,
      options: ['Yes, book it!', 'No, thanks'],
      requiresInput: true,
    };
  }

  private async handleDentistConfirmation(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const response = message.toLowerCase();

    if (response.includes('yes') || response.includes('book')) {
      const dentist = session.context.suggestedDentist;
      
      if (!dentist) {
        return {
          message: "Sorry, I lost track of the dentist. Let's start over.",
          state: ConversationState.GREETING,
          requiresInput: true,
        };
      }

      const availableSlots = dentist.availability.filter(slot => slot.available).slice(0, 5);

      if (availableSlots.length === 0) {
        return {
          message: "Sorry, this dentist has no available slots.",
          state: ConversationState.ERROR,
          requiresInput: false,
        };
      }

      const slotOptions = availableSlots.map(
        (slot, idx) => `${idx + 1}. ${slot.date} at ${slot.time}`
      ).join('\n');

      return {
        message: `Perfect! Here are the available time slots:\n\n${slotOptions}\n\nPlease select a slot by typing the number (1-${availableSlots.length}):`,
        state: ConversationState.AWAITING_DATE_TIME,
        requiresInput: true,
      };
    }

    return {
      message: "No problem! Would you like to start over?",
      state: ConversationState.AWAITING_INTENT,
      requiresInput: true,
    };
  }

  private async handleDateTimeSelection(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const slotNumber = parseInt(message.trim());
    const dentist = session.context.suggestedDentist;

    if (!dentist || isNaN(slotNumber)) {
      return {
        message: "Please enter a valid slot number:",
        state: ConversationState.AWAITING_DATE_TIME,
        requiresInput: true,
      };
    }

    const availableSlots = dentist.availability.filter(slot => slot.available);
    const selectedSlot = availableSlots[slotNumber - 1];

    if (!selectedSlot) {
      return {
        message: `Please enter a number between 1 and ${availableSlots.length}:`,
        state: ConversationState.AWAITING_DATE_TIME,
        requiresInput: true,
      };
    }

    session.context.selectedDate = selectedSlot.date;
    session.context.selectedTime = selectedSlot.time;

    return {
      message: `Perfect! Let me confirm:\n\n👨‍⚕️ Dentist: ${dentist.name}\n📅 Date: ${selectedSlot.date}\n🕐 Time: ${selectedSlot.time}\n\nShall I confirm this booking?`,
      state: ConversationState.AWAITING_FINAL_CONFIRMATION,
      options: ['Yes, confirm!', 'No, change details'],
      requiresInput: true,
    };
  }

  private async handleFinalConfirmation(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const response = message.toLowerCase();

    if (!response.includes('yes') && !response.includes('confirm')) {
      return {
        message: "No problem! What would you like to change?",
        state: ConversationState.AWAITING_INTENT,
        requiresInput: true,
      };
    }

    try {
      const appointmentId = await this.saveAppointment(session);

      return {
        message: `🎉 **Appointment Confirmed!**\n\nYour appointment has been successfully booked.\n\n📋 Appointment ID: **${appointmentId}**\n\nYou'll receive a confirmation email shortly.`,
        state: ConversationState.COMPLETED,
        appointmentId,
        requiresInput: false,
      };
    } catch (error) {
      console.error('Error saving appointment:', error);
      
      return {
        message: "I'm sorry, there was an error saving your appointment. Please try again.",
        state: ConversationState.ERROR,
        requiresInput: true,
      };
    }
  }

  async suggestDentist(specialization: DentalSpecialization): Promise<Dentist | null> {
    try {
      const { data: dentists, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('specialization', specialization)
        .order('rating', { ascending: false })
        .limit(1);

      if (error || !dentists || dentists.length === 0) {
        return null;
      }

      const dentist = dentists[0];

      return {
        id: dentist.id,
        name: dentist.name,
        specialization: dentist.specialization,
        rating: dentist.rating || 4.5,
        availability: [
          { date: '2025-10-30', time: '09:00', available: true },
          { date: '2025-10-30', time: '14:00', available: true },
          { date: '2025-10-31', time: '10:00', available: true },
        ],
        email: dentist.email,
      };
    } catch (error) {
      console.error('Error fetching dentist:', error);
      return null;
    }
  }

  private async saveAppointment(session: ChatSession): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const context = session.context;
    const dentist = context.suggestedDentist;

    if (!dentist || !context.selectedDate || !context.selectedTime) {
      throw new Error('Missing required appointment data');
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        patient_name: context.patientName,
        patient_email: context.patientEmail,
        patient_phone: context.patientPhone,
        dentist_id: dentist.id,
        dentist_name: dentist.name,
        appointment_date: context.selectedDate,
        appointment_time: context.selectedTime,
        symptoms: context.symptom,
        appointment_type: context.specialization,
        status: 'pending', // Changed to 'pending' to match backend expectations
        booking_reference: this.generateBookingReference(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Real-time sync: The database trigger (notify_appointment_change) will automatically
    // broadcast this to all subscribed clients (admin dashboard, dentist dashboard, user dashboard)
    // No manual broadcast needed - Supabase Realtime handles it via postgres_changes

    return appointment.booking_reference || appointment.id;
  }

  /**
   * Check user's existing appointments
   * Shows upcoming appointments with details
   */
  private async checkUserAppointments(session: ChatSession): Promise<ChatbotResponse> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        message: "Please sign in to check your appointments.",
        state: ConversationState.ERROR,
        requiresInput: true,
      };
    }

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id)
      .eq('status', 'upcoming')
      .order('appointment_date', { ascending: true });

    if (!appointments || appointments.length === 0) {
      return {
        message: "You don't have any upcoming appointments. Would you like to book one?",
        state: ConversationState.AWAITING_INTENT,
        options: ['Yes, book appointment', 'No, thanks'],
        requiresInput: true,
      };
    }

    const appointmentList = appointments
      .map((apt, idx) => 
        `${idx + 1}. **${apt.dentist_name}** - ${apt.appointment_date} at ${apt.appointment_time}\n   📋 ID: ${apt.booking_reference || apt.id}`
      )
      .join('\n\n');

    return {
      message: `Here are your upcoming appointments:\n\n${appointmentList}\n\nWould you like to book another appointment?`,
      state: ConversationState.AWAITING_INTENT,
      options: ['Book new appointment', 'No, thanks'],
      requiresInput: true,
    };
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string): UserIntent {
    const lowerMessage = message.toLowerCase();

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent as UserIntent;
      }
    }

    return UserIntent.UNKNOWN;
  }

  private detectSpecialization(symptom: string): DentalSpecialization {
    const lowerSymptom = symptom.toLowerCase();

    for (const [keyword, specialization] of Object.entries(SYMPTOM_SPECIALIZATION_MAP)) {
      if (lowerSymptom.includes(keyword)) {
        return specialization;
      }
    }

    return DentalSpecialization.GENERAL;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateBookingReference(): string {
    return `DCC-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  clearSession(userId: string): void {
    activeSessions.delete(userId);
  }
}

export const chatbotService = new ChatbotService();

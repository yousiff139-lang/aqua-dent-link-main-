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
  TimeSlot,
} from '@/types/chatbot';
import { generateAppointmentPDF, pdfToBlob } from './pdfGenerator';
import { searchDentalKnowledge, isDentalQuestion } from './dentalKnowledge';

/**
 * In-memory session storage
 * In production, consider using Redis or Supabase table
 */
const activeSessions = new Map<string, ChatSession>();

/**
 * Log chatbot conversation to database
 */
async function logChatbotConversation(
  userId: string | undefined,
  intent: UserIntent,
  extractedSymptoms?: string,
  suggestedDentistId?: string,
  conversationState?: ConversationState,
  appointmentId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Skip logging for guest sessions (no userId)
    if (!userId || userId.startsWith('guest_')) {
      return;
    }

    // Check if log entry exists for this conversation
    const { data: existingLog } = await supabase
      .from('chatbot_logs')
      .select('id, message_count')
      .eq('user_id', userId)
      .eq('intent', intent)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const logData = {
      user_id: userId,
      intent: intent,
      extracted_symptoms: extractedSymptoms || null,
      suggested_dentist_id: suggestedDentistId || null,
      conversation_state: conversationState || null,
      message_count: existingLog ? (existingLog.message_count || 0) + 1 : 1,
      completed: !!appointmentId,
      appointment_id: appointmentId || null,
      metadata: metadata || {},
    };

    if (existingLog) {
      // Update existing log
      await supabase
        .from('chatbot_logs')
        .update(logData)
        .eq('id', existingLog.id);
    } else {
      // Create new log entry
      await supabase
        .from('chatbot_logs')
        .insert(logData);
    }
  } catch (error) {
    // Don't fail conversation if logging fails
    console.error('Error logging chatbot conversation:', error);
  }
}

/**
 * ChatbotService Class
 * Main service for handling chatbot interactions
 */
export class ChatbotService {
  /**
   * Start a new conversation session
   * Supports both authenticated and guest users
   * Automatically fetches patient data from Supabase for authenticated users
   * @param userId - The user's ID (optional for guest users)
   * @returns Welcome message with personalized greeting
   */
  async startConversation(userId?: string): Promise<ChatbotResponse> {
    // Generate a guest session ID if no userId provided
    const sessionId = userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Try to fetch patient data from Supabase if userId is provided
    let patient = null;
    if (userId) {
      const { data: patientData, error: patientError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', userId)
        .single();

      if (!patientError && patientData) {
        patient = patientData;
      }
    }

    // Extract first name for personalized greeting
    const firstName = patient?.full_name?.split(' ')[0] || 'there';
    
    // Create new session with pre-filled patient data (if available)
    const session: ChatSession = {
      userId: sessionId,
      currentState: ConversationState.GREETING,
      context: {
        patientName: patient?.full_name,
        patientEmail: patient?.email,
        patientPhone: patient?.phone,
        isGuest: !userId, // Mark guest sessions
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    activeSessions.set(sessionId, session);

    // Personalized greeting with patient's first name (or generic for guests)
    const greeting = patient?.full_name 
      ? `Hi ${firstName}! Welcome back to DentalCareConnect 👋`
      : `Hello! Welcome to DentalCareConnect 👋`;

    return {
      message: `${greeting}\n\nI'm your virtual dental assistant. How can I help you today?\n\n• Book an Appointment\n• Ask a Question About Dentistry\n• View Available Dentists`,
      state: ConversationState.AWAITING_INTENT,
      options: ['Book an Appointment', 'Ask a Question', 'View Available Dentists'],
      requiresInput: true,
    };
  }

  /**
   * Handle user input and progress conversation
   * Supports both authenticated and guest users
   * @param userId - The user's ID or session ID (optional for guest users)
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

      case ConversationState.AWAITING_PAYMENT_METHOD:
        response = await this.handlePaymentMethod(session, message);
        break;

      case ConversationState.AWAITING_QUESTION:
        response = await this.handleQuestion(session, message);
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

        // Log intent to chatbot_logs
        await logChatbotConversation(
          user.id,
          UserIntent.BOOK_APPOINTMENT,
          undefined,
          undefined,
          ConversationState.AWAITING_SYMPTOM
        );

        // Always fetch fresh data from auth user and profile
        // Use auth user email directly if profile doesn't have it
        let patientName = session.context.patientName;
        let patientEmail = session.context.patientEmail || user.email || '';
        let patientPhone = session.context.patientPhone;

        // Fetch from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', user.id)
          .single();

        // Update session context with fetched data
        if (profile) {
          patientName = profile.full_name || patientName;
          patientEmail = profile.email || user.email || patientEmail;
          patientPhone = profile.phone || patientPhone;
        } else {
          // If no profile, use auth user data
          patientEmail = user.email || patientEmail;
        }

        // Update session context
        session.context.patientName = patientName;
        session.context.patientEmail = patientEmail;
        session.context.patientPhone = patientPhone;

        // If we have name and email, skip collection - go straight to symptom
        if (patientName && patientEmail) {
          const firstName = patientName.split(' ')[0];
          return {
            message: `Perfect, ${firstName}! I have your details on file.\n\n📧 Email: ${patientEmail}\n${patientPhone ? `📞 Phone: ${patientPhone}` : '📞 Phone: (not provided - we\'ll ask for it if needed)'}\n\nNow, could you describe your dental concern or symptom?\n\nFor example:\n• Tooth pain\n• Gum bleeding\n• Need braces\n• Wisdom teeth removal`,
            state: ConversationState.AWAITING_SYMPTOM,
            requiresInput: true,
          };
        }

        // Only ask for missing info (never ask for email if we have it from auth)
        if (!patientName) {
          return {
            message: "Great! Let's book your appointment. I have your email on file. What's your full name?",
            state: ConversationState.AWAITING_NAME,
            requiresInput: true,
          };
        }

        // If name exists but email doesn't (shouldn't happen with auth user), ask for email
        return {
          message: "What's your email address?",
          state: ConversationState.AWAITING_EMAIL,
          requiresInput: true,
        };

      case UserIntent.CHECK_APPOINTMENT:
        return await this.checkUserAppointments(session);

      case UserIntent.ASK_QUESTION:
        return {
          message: "I'd be happy to help! What would you like to know about dental care?",
          state: ConversationState.AWAITING_QUESTION,
          requiresInput: true,
        };

      case UserIntent.VIEW_DENTISTS:
        return await this.viewAvailableDentists(session);

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
    const lowerMessage = message.toLowerCase().trim();
    
    // Handle "I don't know" or uncertainty
    if (lowerMessage.includes("don't know") || lowerMessage.includes("don't know") || 
        lowerMessage === "unknown" || lowerMessage.includes("not sure") || 
        lowerMessage.includes("unsure")) {
      session.context.symptom = "unknown";
      session.context.specialization = DentalSpecialization.GENERAL;
      
      // Find any available dentist (general or first available)
      const dentist = await this.suggestDentist(DentalSpecialization.GENERAL);
      
      if (!dentist) {
        return {
          message: "No problem! I've noted that you're not sure about your symptoms. Would you like to book with a general dentist who can help diagnose your issue?",
          state: ConversationState.AWAITING_INTENT,
          requiresInput: true,
        };
      }

      session.context.suggestedDentist = dentist;
      
      return {
        message: "No problem! I've noted that you're not sure about your symptoms.\n\nBased on this, I'd suggest:\n\n👨‍⚕️ **Dr. " + dentist.name.split(' ').pop() + "** (General Dentist)\n⭐ Rating: " + dentist.rating + "/5.0\n\nA general dentist can help diagnose and recommend the right specialist if needed. Would you like to book with this dentist?",
        state: ConversationState.AWAITING_DENTIST_CONFIRMATION,
        suggestedDentist: dentist,
        options: ['Yes, book it!', 'Choose another dentist'],
        requiresInput: true,
      };
    }

    session.context.symptom = message;
    const specialization = this.detectSpecialization(message);
    session.context.specialization = specialization;

    const dentist = await this.suggestDentist(specialization);

    // Log symptom extraction and dentist suggestion
    const userId = session.userId.startsWith('guest_') ? undefined : session.userId;
    if (userId) {
      await logChatbotConversation(
        userId,
        UserIntent.BOOK_APPOINTMENT,
        message,
        dentist?.id,
        session.currentState
      );
    }

    if (!dentist) {
      return {
        message: `I understand you're experiencing ${message}. Unfortunately, we don't have any ${specialization} available right now. Would you like to see all available dentists?`,
        state: ConversationState.AWAITING_INTENT,
        options: ['View All Dentists', 'Start Over'],
        requiresInput: true,
      };
    }

    session.context.suggestedDentist = dentist;
    const nextSlot = dentist.availability.find(slot => slot.available);
    const slotInfo = nextSlot ? `${nextSlot.date} at ${nextSlot.time}` : 'soon';

    return {
      message: `Based on what you said, **${dentist.name}** (${specialization}) seems like the best match.\n\n✨ Here's the recommendation:\n\n👨‍⚕️ **${dentist.name}**\n⭐ Rating: ${dentist.rating}/5.0\n📅 Available: ${slotInfo}\n\nWould you like to book with this dentist or choose another dentist?`,
      state: ConversationState.AWAITING_DENTIST_CONFIRMATION,
      suggestedDentist: dentist,
      options: ['Yes, book with this dentist', 'Choose another dentist'],
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

      // Refresh availability from database to get the most current slots
      const { data: dentistData } = await supabase
        .from('dentists')
        .select('available_times')
        .eq('id', dentist.id)
        .single();

      const refreshedAvailability = await this.parseAvailableTimes(
        dentistData?.available_times,
        dentist.id
      );

      // Update dentist availability with refreshed data
      if (refreshedAvailability.length > 0) {
        dentist.availability = refreshedAvailability;
      }
      
      // Update session context with refreshed dentist
      session.context.suggestedDentist = dentist;

      const availableSlots = dentist.availability.filter(slot => slot.available).slice(0, 10);

      if (availableSlots.length === 0) {
        return {
          message: "Sorry, this dentist has no available slots at the moment. Would you like to choose another dentist?",
          state: ConversationState.AWAITING_INTENT,
          options: ['View All Dentists', 'Start Over'],
          requiresInput: true,
        };
      }

      // Format dates nicely (e.g., "Monday, Nov 5, 2024")
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric' 
        });
      };

      const slotOptions = availableSlots.map(
        (slot, idx) => `${idx + 1}. ${formatDate(slot.date)} at ${slot.time}`
      ).join('\n');

      return {
        message: `Perfect! Here are the available time slots for ${dentist.name}:\n\n${slotOptions}\n\nPlease select a slot by typing the number (1-${availableSlots.length}):`,
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

    // Now ask for payment method
    return {
      message: `Great! Selected: ${selectedSlot.date} at ${selectedSlot.time}\n\nNow, how would you like to pay?\n\n• Cash\n• Card`,
      state: ConversationState.AWAITING_PAYMENT_METHOD,
      options: ['Cash', 'Card'],
      requiresInput: true,
    };
  }

  private async handlePaymentMethod(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const lowerMessage = message.toLowerCase().trim();
    let paymentMethod: 'cash' | 'card' = 'cash';

    if (lowerMessage.includes('card') || lowerMessage.includes('credit') || lowerMessage.includes('debit')) {
      paymentMethod = 'card';
    }

    session.context.paymentMethod = paymentMethod;
    const dentist = session.context.suggestedDentist;

    // Show confirmation summary
    const confirmationMessage = `Here's what I've gathered:\n\n• Dentist: ${dentist?.name || 'N/A'}\n• Date & Time: ${session.context.selectedTime} on ${session.context.selectedDate}\n• Payment: ${paymentMethod.toUpperCase()}\n• Symptoms: ${session.context.symptom || 'Not specified'}\n\nIs this correct or would you like to edit?`;

    return {
      message: confirmationMessage,
      state: ConversationState.AWAITING_FINAL_CONFIRMATION,
      options: ['Yes, this is correct', 'Edit details'],
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
      const bookingReference = await this.saveAppointment(session);

      // Fetch the appointment to get PDF URL
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('pdf_summary_url, pdf_report_url')
          .eq('booking_reference', bookingReference)
          .single();

        const pdfUrl = appointment?.pdf_summary_url || appointment?.pdf_report_url;
        const pdfMessage = pdfUrl 
          ? `\n\n📄 **PDF Summary Generated!**\nYou can download your appointment summary from the appointment details.`
          : '';

        return {
          message: `🎉 **Appointment Confirmed!**\n\nYour appointment has been successfully booked.\n\n📋 Booking Reference: **${bookingReference}**${pdfMessage}\n\n✅ The appointment has been sent to:\n• Your assigned dentist\n• The admin dashboard\n\nYou'll receive a confirmation email shortly.`,
          state: ConversationState.COMPLETED,
          appointmentId: bookingReference,
          requiresInput: false,
        };
      }

      return {
        message: `🎉 **Appointment Confirmed!**\n\nYour appointment has been successfully booked.\n\n📋 Booking Reference: **${bookingReference}**\n\n✅ The appointment has been sent to:\n• Your assigned dentist\n• The admin dashboard`,
        state: ConversationState.COMPLETED,
        appointmentId: bookingReference,
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
      // Build base query - don't filter by status as it may not exist
      let query = supabase
        .from('dentists')
        .select('*');

      // For general dentists, search more broadly
      if (specialization === DentalSpecialization.GENERAL) {
        // Try various ways to find general dentists
        const { data: generalDentists, error: generalError } = await query
          .or(`specialty.ilike.%general%,specialization.ilike.%general%,specialty.ilike.%General%,specialization.ilike.%General%,specialty.is.null,specialization.is.null`)
          .order('rating', { ascending: false })
          .limit(5);

        // If no general dentists found or error, get any dentist
        let dentist = generalDentists?.[0];
        
        if (!dentist || generalError) {
          const { data: anyDentist } = await supabase
            .from('dentists')
            .select('*')
            .order('rating', { ascending: false })
            .limit(1);
          dentist = anyDentist?.[0];
        }

        if (!dentist) {
          return null;
        }

        // Parse available_times from JSONB
        const availableTimes = await this.parseAvailableTimes(dentist.available_times, dentist.id);

        return {
          id: dentist.id,
          name: dentist.name,
          specialization: dentist.specialization || dentist.specialty || 'General Dentistry',
          rating: dentist.rating || 4.5,
          availability: availableTimes,
          email: dentist.email,
          bio: dentist.bio,
          phone: dentist.phone,
        };
      }

      // For other specializations, normalize the specialization name for matching
      // Map enum values to common database values
      const specializationMap: Record<string, string[]> = {
        'Orthodontist': ['orthodontist', 'orthodontics', 'orthodontic'],
        'Periodontist': ['periodontist', 'periodontics', 'periodontal'],
        'Endodontist': ['endodontist', 'endodontics', 'endodontic'],
        'Oral Surgeon': ['oral surgeon', 'oral surgery', 'maxillofacial', 'oral and maxillofacial'],
        'Pediatric Dentist': ['pediatric', 'pediatric dentist', 'pediatric dentistry', 'pedodontist'],
        'Prosthodontist': ['prosthodontist', 'prosthodontics', 'prosthetic'],
      };

      const searchTerms = specializationMap[specialization] || [specialization.toLowerCase()];
      
      // Build OR condition for matching specialization or specialty
      const orConditions = searchTerms.flatMap(term => [
        `specialty.ilike.%${term}%`,
        `specialization.ilike.%${term}%`
      ]).join(',');

      // Try matching specialty or specialization (case-insensitive)
      const { data: dentists, error } = await query
        .or(orConditions)
        .order('rating', { ascending: false })
        .limit(1);

      let dentist = dentists?.[0];

      // If no match, try general dentist
      if (!dentist || error) {
        const { data: generalDentists } = await supabase
          .from('dentists')
          .select('*')
          .or(`specialty.ilike.%general%,specialization.ilike.%general%,specialty.is.null,specialization.is.null`)
          .order('rating', { ascending: false })
          .limit(1);

        dentist = generalDentists?.[0];

        // If still no match, get any dentist
        if (!dentist) {
          const { data: anyDentist } = await supabase
            .from('dentists')
            .select('*')
            .order('rating', { ascending: false })
            .limit(1);
          dentist = anyDentist?.[0];
        }
      }

      if (!dentist) {
        return null;
      }

      // Parse available_times from JSONB - always refresh from database
      const availableTimes = await this.parseAvailableTimes(dentist.available_times, dentist.id);

      return {
        id: dentist.id,
        name: dentist.name,
        specialization: dentist.specialization || dentist.specialty || 'General Dentistry',
        rating: dentist.rating || 4.5,
        availability: availableTimes,
        email: dentist.email,
        bio: dentist.bio,
        phone: dentist.phone,
      };
    } catch (error) {
      console.error('Error fetching dentist:', error);
      return null;
    }
  }

  /**
   * Parse available_times JSONB into TimeSlot array
   * Supports both array format ["2025-11-02T10:00", "2025-11-02T12:00"]
   * And object format {"monday": "09:00-17:00", ...}
   * Also supports time-only format ["15:00", "16:30", "17:00"] for specific times
   */
  private async parseAvailableTimes(availableTimes: any, dentistId?: string): Promise<TimeSlot[]> {
    if (!availableTimes) {
      return [];
    }

    const slots: TimeSlot[] = [];

    // If it's an array
    if (Array.isArray(availableTimes)) {
      availableTimes.forEach((item: any) => {
        try {
          // Check if it's a full timestamp (e.g., "2025-11-02T10:00")
          if (typeof item === 'string' && item.includes('T')) {
            const date = new Date(item);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toTimeString().slice(0, 5);
            slots.push({ date: dateStr, time: timeStr, available: true });
          }
          // Check if it's just a time string (e.g., "15:00", "16:30")
          else if (typeof item === 'string' && item.match(/^\d{1,2}:\d{2}$/)) {
            // Generate slots for next 7 days with this specific time
            const today = new Date();
            for (let i = 1; i <= 7; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() + i);
              slots.push({ 
                date: date.toISOString().split('T')[0], 
                time: item.trim(), 
                available: true 
              });
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      });
    }
    // If it's an object with day-based availability
    else if (typeof availableTimes === 'object') {
      // Generate slots for next 14 days based on day schedules
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const schedule = availableTimes[dayName];

        if (schedule && typeof schedule === 'string') {
          // Parse "09:00-17:00" format or single time "10:00"
          if (schedule.includes('-')) {
            const [start, end] = schedule.split('-');
            const startTime = this.parseTimeString(start);
            const endTime = this.parseTimeString(end);
            
            // Generate hourly slots
            let current = startTime;
            while (current < endTime) {
              const timeStr = `${Math.floor(current / 60).toString().padStart(2, '0')}:${(current % 60).toString().padStart(2, '0')}`;
              slots.push({ 
                date: date.toISOString().split('T')[0], 
                time: timeStr, 
                available: true 
              });
              current += 60; // Add 1 hour
            }
          } else {
            // Single time slot
            slots.push({ 
              date: date.toISOString().split('T')[0], 
              time: schedule.trim(), 
              available: true 
            });
          }
        }
      }
    }

    // Check for booked appointments and mark slots as unavailable
    if (slots.length > 0 && dentistId) {
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .eq('dentist_id', dentistId)
        .in('status', ['pending', 'confirmed', 'upcoming']);

      if (existingAppointments) {
        // Mark slots as unavailable if they conflict with existing appointments
        slots.forEach(slot => {
          const isBooked = existingAppointments.some(apt => 
            apt.appointment_date === slot.date && 
            apt.appointment_time === slot.time
          );
          if (isBooked) {
            slot.available = false;
          }
        });
      }
    }

    // If no slots generated, create some default ones
    if (slots.length === 0) {
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        // Generate multiple times per day
        const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
        times.forEach(time => {
          slots.push({ 
            date: date.toISOString().split('T')[0], 
            time: time, 
            available: true 
          });
        });
      }
    }

    // Return only available slots, limit to 10
    return slots.filter(s => s.available).slice(0, 10);
  }

  private parseTimeString(timeStr: string): number {
    // Convert "10:00" to minutes since midnight
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * View available dentists
   */
  private async viewAvailableDentists(session: ChatSession): Promise<ChatbotResponse> {
    try {
      const { data: dentists, error } = await supabase
        .from('dentists')
        .select('*')
        .order('rating', { ascending: false });

      if (error || !dentists || dentists.length === 0) {
        return {
          message: "I'm sorry, there are no dentists available at the moment.",
          state: ConversationState.AWAITING_INTENT,
          requiresInput: true,
        };
      }

      const dentistList = dentists
        .slice(0, 10)
        .map((dentist, idx) => 
          `${idx + 1}. **${dentist.name}** - ${dentist.specialization || dentist.specialty || 'General Dentistry'} (⭐ ${dentist.rating || 'N/A'})`
        )
        .join('\n');

      return {
        message: `Here are the available dentists:\n\n${dentistList}\n\nWould you like to:\n• Book an appointment with one of these dentists\n• View more details about a specific dentist`,
        state: ConversationState.AWAITING_INTENT,
        options: ['Book Appointment', 'Back to Menu'],
        requiresInput: true,
      };
    } catch (error) {
      console.error('Error fetching dentists:', error);
      return {
        message: "I'm sorry, there was an error fetching the dentist list.",
        state: ConversationState.ERROR,
        requiresInput: true,
      };
    }
  }

  private async saveAppointment(session: ChatSession): Promise<string> {
    // Check if this is a guest session - require authentication for booking
    if (session.context.isGuest || session.userId.startsWith('guest_')) {
      throw new Error('Please sign in to book an appointment. You can continue where you left off after logging in.');
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Please sign in to book an appointment. Your conversation will be saved.');
    }
    
    // Validate that session has a valid user ID (not guest ID)
    if (session.userId !== user.id) {
      throw new Error('Session mismatch. Please refresh and try again.');
    }

    const context = session.context;
    const dentist = context.suggestedDentist;

    if (!dentist || !context.selectedDate || !context.selectedTime) {
      throw new Error('Missing required appointment data');
    }

    const bookingReference = this.generateBookingReference();

    // First, create the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        patient_name: context.patientName || 'Unknown',
        patient_email: context.patientEmail || user.email || '',
        patient_phone: context.patientPhone || '',
        dentist_id: dentist.id,
        dentist_email: dentist.email,
        appointment_date: context.selectedDate,
        appointment_time: context.selectedTime,
        time: new Date(`${context.selectedDate}T${context.selectedTime}`).toISOString(),
        symptoms: context.symptom || 'Not specified',
        payment_method: context.paymentMethod || 'cash',
        payment_status: 'pending',
        status: 'pending',
        booking_reference: bookingReference,
      })
      .select()
      .single();

      if (error) {
        throw error;
      }

      // Update chatbot log with appointment ID and mark as completed
      if (session.userId && !session.userId.startsWith('guest_')) {
        await logChatbotConversation(
          session.userId,
          UserIntent.BOOK_APPOINTMENT,
          context.symptom,
          dentist.id,
          ConversationState.COMPLETED,
          appointment.id,
          {
            payment_method: context.paymentMethod,
            selected_date: context.selectedDate,
            selected_time: context.selectedTime,
            booking_reference: bookingReference,
          }
        );
      }

      // Generate PDF summary
    let pdfUrl: string | null = null;
    try {
      const pdfData = {
        patientName: context.patientName || 'Unknown',
        dentistName: dentist.name,
        symptoms: context.symptom || 'Not specified',
        appointmentTime: context.selectedTime || '',
        appointmentDate: context.selectedDate || '',
        paymentMethod: (context.paymentMethod || 'cash') as 'cash' | 'card',
        bookingReference: bookingReference,
      };

      const pdfBytes = generateAppointmentPDF(pdfData);
      const pdfBlob = pdfToBlob(pdfBytes);

      // Upload to Supabase Storage
      const fileName = `appointment-summary-${appointment.id}-${Date.now()}.pdf`;
      
      // Try appointment-documents bucket first, then appointment-pdfs
      let bucketName = 'appointment-documents';
      let { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      // If first bucket fails, try the alternative
      if (uploadError) {
        bucketName = 'appointment-pdfs';
        const result = await supabase.storage
          .from(bucketName)
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false,
          });
        uploadError = result.error;
      }

      if (!uploadError) {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        pdfUrl = urlData.publicUrl;

        // Update appointment with PDF URL
        await supabase
          .from('appointments')
          .update({ 
            pdf_summary_url: pdfUrl,
            pdf_report_url: pdfUrl, // Also update legacy field
          })
          .eq('id', appointment.id);
      } else {
        console.warn('Failed to upload PDF:', uploadError);
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      // Don't fail the appointment creation if PDF fails
    }

    // Real-time sync: The database trigger will automatically broadcast this
    // to all subscribed clients (admin dashboard, dentist dashboard, user dashboard)
    // No manual broadcast needed - Supabase Realtime handles it via postgres_changes

    return bookingReference;
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
   * Handle dental questions
   * Searches dental knowledge base, if not found suggests booking
   */
  private async handleQuestion(session: ChatSession, message: string): Promise<ChatbotResponse> {
    // Check if it's a dental-related question
    if (!isDentalQuestion(message)) {
      return {
        message: "I specialize in dental care questions! Could you ask me something about teeth, gums, or dental health? Or would you like to book an appointment?",
        state: ConversationState.AWAITING_INTENT,
        options: ['Book Appointment', 'Ask Dental Question', 'View Dentists'],
        requiresInput: true,
      };
    }

    // Log question intent
    const userId = session.userId.startsWith('guest_') ? undefined : session.userId;
    if (userId) {
      await logChatbotConversation(
        userId,
        UserIntent.ASK_QUESTION,
        message,
        undefined,
        ConversationState.AWAITING_QUESTION,
        undefined,
        { question: message }
      );
    }

    // Search dental knowledge base
    const answer = searchDentalKnowledge(message);

    if (answer) {
      // Answer found in knowledge base
      return {
        message: answer,
        state: ConversationState.AWAITING_INTENT,
        options: ['Book Appointment', 'Ask Another Question', 'Back to Menu'],
        requiresInput: true,
      };
    }

    // Answer not found - suggest booking
    return {
      message: "I couldn't find a reliable answer for that specific question in my knowledge base. Would you like to book an appointment so a dentist can check it personally and provide you with expert advice?",
      state: ConversationState.AWAITING_INTENT,
      options: ['Yes, Book Appointment', 'Ask Another Question', 'Back to Menu'],
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

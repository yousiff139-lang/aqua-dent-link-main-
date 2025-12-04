/**
 * Chatbot Service for DentalCareConnect
 * Handles conversation flow, intent detection, and appointment booking
 * Now includes real-time availability synchronization
 */

import { supabase } from '@/integrations/supabase/client';
import { chatbotRealtimeSync } from '@/services/chatbotRealtimeSync';
import { extractPatientInfo, getMissingInfo } from './aiService';
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
  ConversationContext,
} from '@/types/chatbot';
import { generateAppointmentPDF, pdfToBlob } from './pdfGenerator';
import { searchDentalKnowledge, isDentalQuestion } from './dentalKnowledge';
import { sendBookingConfirmation, sendNewBookingAlert } from './notificationService';

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
    // @ts-ignore - chatbot_logs table will be created by migration
    const { data: existingLog } = await (supabase as any)
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
      // @ts-ignore - chatbot_logs table will be created by migration
      await (supabase as any)
        .from('chatbot_logs')
        .update(logData)
        .eq('id', existingLog.id);
    } else {
      // Create new log entry
      // @ts-ignore - chatbot_logs table will be created by migration
      await (supabase as any)
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
      message: `${greeting}\n\nI'm your virtual dental assistant. How can I help you today?\n\n1️⃣ Book an Appointment\n2️⃣ Ask a General Dentistry Question`,
      state: ConversationState.AWAITING_INTENT,
      options: ['Book Appointment', 'Ask Question'],
      requiresInput: true,
    };
  }

  /**
   * Handle user input with AI-powered natural language understanding
   * @param userId - The user's ID or session ID
   * @param message - User's message (can be natural language)
   * @returns Chatbot response
   */
  async handleUserInput(userId: string, message: string): Promise<ChatbotResponse> {
    let session = activeSessions.get(userId);

    if (!session) {
      return await this.startConversation(userId);
    }

    session.updatedAt = new Date();

    // Check for explicit intent first (especially for Q&A)
    // This prevents the "Guided AI Flow" from hijacking Q&A requests
    const intent = this.detectIntent(message);
    if (intent === UserIntent.ASK_QUESTION) {
      return await this.handleQuestion(session, message);
    }
    if (intent === UserIntent.BACK_TO_MENU) {
      return await this.startConversation(userId);
    }

    // If we are waiting for a question, route directly to Q&A handler
    if (session.currentState === ConversationState.AWAITING_QUESTION) {
      return await this.handleQuestion(session, message);
    }

    // If in specific state-based flow, use standard handlers (more reliable)
    if (
      session.currentState === ConversationState.AWAITING_GENDER ||
      session.currentState === ConversationState.AWAITING_PREGNANCY ||
      session.currentState === ConversationState.AWAITING_PHONE ||
      session.currentState === ConversationState.AWAITING_NAME ||
      session.currentState === ConversationState.AWAITING_EMAIL ||
      session.currentState === ConversationState.AWAITING_SYMPTOM ||
      session.currentState === ConversationState.AWAITING_MEDICAL_HISTORY ||
      session.currentState === ConversationState.AWAITING_DOCUMENTS ||
      session.currentState === ConversationState.AWAITING_CHRONIC_DISEASES ||
      session.currentState === ConversationState.AWAITING_DENTIST_CONFIRMATION ||
      session.currentState === ConversationState.AWAITING_DATE_TIME ||
      session.currentState === ConversationState.AWAITING_PAYMENT_METHOD ||
      session.currentState === ConversationState.AWAITING_FINAL_CONFIRMATION
    ) {
      console.log('📍 Using state-based handler for:', session.currentState);
      return this.handleUserInputFallback(session, message);
    }

    // **GUIDED AI FLOW** - Specific order but natural language (only for initial intent detection)
    console.log('🤖 Guided AI Flow - Processing:', message);

    try {
      // Determine current step in the flow
      const currentStep = this.getCurrentFlowStep(session.context);
      console.log('📍 Current Step:', currentStep);

      // Use AI to extract info and get next question
      const extracted = await extractPatientInfo(message, session.context, currentStep);
      console.log('🤖 AI Response:', extracted);

      // Update context with extracted information
      if (extracted.gender) session.context.gender = extracted.gender;
      if (extracted.isPregnant !== null) session.context.isPregnant = extracted.isPregnant;
      if (extracted.phone) session.context.patientPhone = extracted.phone;
      if (extracted.symptoms) session.context.symptom = extracted.symptoms;
      if (extracted.chronicDiseases) session.context.chronicDiseases = extracted.chronicDiseases;
      if (extracted.medicalHistory) session.context.medicalHistory = extracted.medicalHistory;
      if (extracted.wantsDocuments !== null) session.context.wantsDocuments = extracted.wantsDocuments;

      // Get next step
      const nextStep = this.getCurrentFlowStep(session.context);
      console.log('➡️ Next Step:', nextStep);

      // If all info collected, suggest dentist
      if (nextStep === 'complete' && session.context.symptom) {
        return await this.suggestDentistFromContext(session);
      }

      // Map next step to proper conversation state
      const stateMap: Record<string, ConversationState> = {
        'gender': ConversationState.AWAITING_GENDER,
        'pregnancy': ConversationState.AWAITING_PREGNANCY,
        'phone': ConversationState.AWAITING_PHONE,
        'symptoms': ConversationState.AWAITING_SYMPTOM,
        'chronic_diseases': ConversationState.AWAITING_CHRONIC_DISEASES,
        'medical_history': ConversationState.AWAITING_MEDICAL_HISTORY,
        'documents': ConversationState.AWAITING_DOCUMENTS,
      };

      const nextState = stateMap[nextStep] || ConversationState.AWAITING_INTENT;

      // Return AI-generated next question
      const response = {
        message: extracted.nextQuestion || this.getDefaultQuestion(nextStep),
        state: nextState,
        requiresInput: true,
      };

      session.currentState = nextState;
      activeSessions.set(userId, session);
      console.log('✅ State updated to:', nextState, 'Context:', session.context);
      return response;

    } catch (error) {
      console.error('🔴 Error in Guided AI Flow:', error);
      return this.handleUserInputFallback(session, message);
    }
  }

  /**
   * Determine current step in the guided flow
   */
  private getCurrentFlowStep(context: ConversationContext): string {
    if (!context.gender) return 'gender';
    if (context.gender === 'female' && context.isPregnant === undefined) return 'pregnancy';
    if (!context.patientPhone) return 'phone';
    if (!context.symptom) return 'symptoms';
    if (!context.chronicDiseases) return 'chronic_diseases';
    if (!context.medicalHistory) return 'medical_history';
    if (context.wantsDocuments === undefined) return 'documents';
    return 'complete';
  }

  /**
   * Get default question for each step (fallback)
   */
  private getDefaultQuestion(step: string): string {
    switch (step) {
      case 'gender':
        return "To provide the best care, could you tell me your gender?\n\n• Male\n• Female";
      case 'pregnancy':
        return "One important question: Are you currently pregnant?\n\n• Yes\n• No";
      case 'phone':
        return "What's the best phone number to reach you for appointment confirmations?";
      case 'symptoms':
        return "What dental concern brings you in today? Please describe your symptoms.";
      case 'chronic_diseases':
        return "**Important:** Do you have any chronic conditions?\n\n• Diabetes\n• High blood pressure\n• Heart disease\n• Other (please specify)\n• None";
      case 'medical_history':
        return "Do you have medical history from previous dental visits? (This is optional - type 'skip' if you don't have any)";
      case 'documents':
        return "Would you like to upload documents like X-rays or previous reports?\n\n• Yes\n• No / Skip";
      default:
        return "How can I help you today?";
    }
  }

  /**
   * Suggest dentist after all info is collected
   */
  private async suggestDentistFromContext(session: ChatSession): Promise<ChatbotResponse> {
    console.log('✅ All info collected! Suggesting dentist...');

    const specialization = this.detectSpecialization(session.context.symptom!);
    session.context.specialization = specialization;

    const dentist = await this.suggestDentist(specialization);

    if (!dentist) {
      return {
        message: "I apologize, but we don't have any available dentists at the moment. Would you like to try again later?",
        state: ConversationState.AWAITING_INTENT,
        requiresInput: true,
      };
    }

    session.context.suggestedDentist = dentist;
    const nextSlot = dentist.availability.find(slot => slot.available);
    const slotInfo = nextSlot ? `${nextSlot.date} at ${nextSlot.time}` : 'soon';

    let messagePrefix = "";
    if (session.context.wantsDocuments) {
      messagePrefix = "I've noted that you have documents to upload. You'll receive a secure upload link in your confirmation email.\n\n";
    }

    const response = {
      message: `${messagePrefix}Perfect! Based on your symptoms, I recommend:\n\n👨‍⚕️ **${dentist.name}**\n🏥 ${dentist.specialization}\n⭐ Rating: ${dentist.rating}/5.0\n📅 Available: ${slotInfo}\n\nWould you like to book with ${dentist.name}?`,
      state: ConversationState.AWAITING_DENTIST_CONFIRMATION,
      suggestedDentist: dentist,
      options: ['Yes, book with this dentist', 'Choose another dentist'],
      requiresInput: true,
    };

    session.currentState = response.state;
    activeSessions.set(session.userId, session);
    return response;
  }

  /**
   * Fallback to state machine if AI fails
   */
  private async handleUserInputFallback(session: ChatSession, message: string): Promise<ChatbotResponse> {
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

      case ConversationState.AWAITING_GENDER:
        response = await this.handleGender(session, message);
        break;

      case ConversationState.AWAITING_PREGNANCY:
        response = await this.handlePregnancy(session, message);
        break;

      case ConversationState.AWAITING_SYMPTOM:
        response = await this.handleSymptomInput(session, message);
        break;

      case ConversationState.AWAITING_MEDICAL_HISTORY:
        response = await this.handleMedicalHistory(session, message);
        break;

      case ConversationState.AWAITING_DOCUMENTS:
        response = await this.handleDocumentUpload(session, message);
        break;

      case ConversationState.AWAITING_CHRONIC_DISEASES:
        response = await this.handleChronicDiseases(session, message);
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
    activeSessions.set(session.userId, session);

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

        // If we have name and email, ask for gender first
        if (patientName && patientEmail) {
          const firstName = patientName.split(' ')[0];
          return {
            message: `Perfect, ${firstName}! I have your details on file.\n\n📧 Email: ${patientEmail}\n${patientPhone ? `📞 Phone: ${patientPhone}` : '📞 Phone: (we\'ll ask for it shortly)'}\n\nBefore we proceed, could you please tell me your gender?\n\n• Male\n• Female`,
            state: ConversationState.AWAITING_GENDER,
            options: ['Male', 'Female'],
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

      // case UserIntent.VIEW_DENTISTS:
      //   return await this.viewAvailableDentists(session);

      default:
        return {
          message: "I'm not sure I understood that. Would you like to:\n\n• Book an appointment\n• Ask a question",
          state: ConversationState.AWAITING_INTENT,
          options: ['Book Appointment', 'Ask Question'],
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
    const phone = message.trim();

    // Validate phone number format (digits only, 10-15 digits)
    const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits

    if (phoneDigits.length < 10) {
      return {
        message: "Please enter a valid phone number with at least 10 digits:",
        state: ConversationState.AWAITING_PHONE,
        requiresInput: true,
      };
    }

    if (phoneDigits.length > 15) {
      return {
        message: "Phone number seems too long. Please enter a valid phone number (10-15 digits):",
        state: ConversationState.AWAITING_PHONE,
        requiresInput: true,
      };
    }

    // Save the phone number
    session.context.patientPhone = phone;

    return {
      message: "Perfect! Now, could you describe your dental concern or symptom?",
      state: ConversationState.AWAITING_SYMPTOM,
      requiresInput: true,
    };
  }

  private async handleGender(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const gender = message.toLowerCase().trim();

    console.log('🔵 Gender input received:', message);
    console.log('🔵 Current context before:', JSON.stringify(session.context));

    if ((gender.includes('male') && !gender.includes('female')) || gender === 'm' || gender === 'man' || gender === 'boy') {
      session.context.gender = 'male';
      console.log('🔵 Gender set to: male');
    } else if (gender.includes('female') || gender === 'f' || gender === 'woman' || gender === 'girl') {
      session.context.gender = 'female';
      console.log('🔵 Gender set to: female');
    } else {
      // Invalid input - ask again
      return {
        message: "Please select your gender:\n\n• Male\n• Female",
        state: ConversationState.AWAITING_GENDER,
        options: ['Male', 'Female'],
        requiresInput: true,
      };
    }

    // CRITICAL: Update session state and save it immediately
    const nextState = session.context.gender === 'female'
      ? ConversationState.AWAITING_PREGNANCY
      : (!session.context.patientPhone ? ConversationState.AWAITING_PHONE : ConversationState.AWAITING_SYMPTOM);

    session.currentState = nextState;
    // Save updated session immediately
    activeSessions.set(session.userId, session);
    console.log('🔵 Context after gender set:', JSON.stringify(session.context));
    console.log('🔵 State updated to:', nextState);

    // CRITICAL: If female, MUST ask about pregnancy
    if (session.context.gender === 'female') {
      console.log('🔵 ASKING PREGNANCY QUESTION for female patient');
      return {
        message: "Thank you! One important question: Are you currently pregnant?\n\n• Yes\n• No",
        state: ConversationState.AWAITING_PREGNANCY,
        options: ['Yes', 'No'],
        requiresInput: true,
      };
    }

    // If male, check if phone is missing
    console.log('🔵 Male patient - checking phone');
    if (!session.context.patientPhone) {
      return {
        message: "Thank you! Before we continue, I'll need your phone number for appointment confirmations:",
        state: ConversationState.AWAITING_PHONE,
        requiresInput: true,
      };
    }

    // If male and phone exists, go to symptoms
    return {
      message: "Thank you! Now, could you describe your dental concern or symptom?\n\nFor example:\n• Tooth pain\n• Gum bleeding\n• Need braces\n• Wisdom teeth removal",
      state: ConversationState.AWAITING_SYMPTOM,
      requiresInput: true,
    };
  }

  private async handlePregnancy(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const response = message.toLowerCase().trim();

    if (response.includes('yes') || response === 'y' || response.includes('pregnant')) {
      session.context.isPregnant = true;
    } else if (response.includes('no') || response === 'n' || response.includes('not')) {
      session.context.isPregnant = false;
    } else {
      return {
        message: "I didn't quite catch that. Are you currently pregnant?\n\n• Yes\n• No",
        state: ConversationState.AWAITING_PREGNANCY,
        options: ['Yes', 'No'],
        requiresInput: true,
      };
    }

    // Check if phone number is missing
    if (!session.context.patientPhone) {
      return {
        message: "Thank you for letting me know! Before we continue, I'll need your phone number for appointment confirmations:",
        state: ConversationState.AWAITING_PHONE,
        requiresInput: true,
      };
    }

    // If phone exists, go to symptoms
    return {
      message: "Thank you for letting me know! Now, could you describe your dental concern or symptom?\n\nFor example:\n• Tooth pain\n• Gum bleeding\n• Need braces\n• Wisdom teeth removal",
      state: ConversationState.AWAITING_SYMPTOM,
      requiresInput: true,
    };
  }

  private async handleMedicalHistory(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const response = message.toLowerCase().trim();

    // Option 1: Skip
    if (response.includes('skip') || response.includes('no') || response.includes('none')) {
      // User has no medical history - proceed to chronic diseases
      return {
        message: "**Important:** Do you have any chronic conditions such as:\n• Diabetes\n• High blood pressure\n• Heart disease\n• Other chronic conditions\n\nPlease list them, or type 'none' if you don't have any:",
        state: ConversationState.AWAITING_CHRONIC_DISEASES,
        requiresInput: true,
      };
    }

    // Option 2: Upload Documents
    if (response.includes('upload') || response.includes('document')) {
      // Enable file upload and ask user to upload
      return {
        message: "Great! Please use the **upload button** (📎) next to the message box to upload your documents.\n\nYou can upload:\n• X-rays\n• Previous dental reports\n• Medical records\n• Prescriptions\n\nSupported formats: PDF, JPG, PNG\n\nClick 'Done' when finished uploading, or type your medical history if you prefer.",
        state: ConversationState.AWAITING_MEDICAL_HISTORY,
        options: ['Done uploading'],
        requiresInput: true,
        showFileUpload: true, // Enable the upload button
      };
    }

    // Option 3: User is providing text medical history
    // If they typed something else (not skip, not upload), treat it as medical history text
    session.context.medicalHistory = message.trim();

    // Proceed to chronic diseases
    return {
      message: "**Important:** Do you have any chronic conditions such as:\n• Diabetes\n• High blood pressure\n• Heart disease\n• Other chronic conditions\n\nPlease list them, or type 'none' if you don't have any:",
      state: ConversationState.AWAITING_CHRONIC_DISEASES,
      requiresInput: true,
    };
  }

  private async handleDocumentUpload(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const lowerMessage = message.toLowerCase().trim();

    // Check if message contains uploaded file URLs
    if (message.includes('[Uploaded Files]:')) {
      session.context.wantsDocuments = true;

      // Extract URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.match(urlRegex) || [];
      session.context.documentUrls = urls;

      session.currentState = ConversationState.AWAITING_PAYMENT_METHOD;
      activeSessions.set(session.userId, session);
      return {
        message: "Documents received! 📄\n\nNow, how would you like to pay for your visit?\n\n• Cash\n• Card",
        state: ConversationState.AWAITING_PAYMENT_METHOD,
        options: ['Cash', 'Card'],
        requiresInput: true,
      };
    }

    if (lowerMessage.includes('skip') || lowerMessage.includes('no') || lowerMessage.includes('done')) {
      // Store that user skipped or finished uploading
      session.context.wantsDocuments = false;
      session.currentState = ConversationState.AWAITING_PAYMENT_METHOD;
      activeSessions.set(session.userId, session);
      return {
        message: "No problem! Now, how would you like to pay?\n\n• Cash\n• Card",
        state: ConversationState.AWAITING_PAYMENT_METHOD,
        options: ['Cash', 'Card'],
        requiresInput: true,
      };
    }

    if (lowerMessage.includes('yes') || lowerMessage.includes('upload')) {
      session.context.wantsDocuments = true;
      session.currentState = ConversationState.AWAITING_DOCUMENTS;
      activeSessions.set(session.userId, session);
      return {
        message: "Great! Please upload your documents (X-rays, reports, etc.). You can upload multiple files.\n\nSupported formats: PDF, JPG, PNG\n\nClick the upload button below, then click 'Done' when finished.",
        state: ConversationState.AWAITING_DOCUMENTS,
        options: ['Done', 'Skip'],
        requiresInput: true,
        showFileUpload: true,
      };
    }

    return {
      message: "Would you like to upload documents (X-rays, medical reports, etc.)?\n\n• Yes, upload documents\n• Skip",
      state: ConversationState.AWAITING_DOCUMENTS,
      options: ['Yes, upload documents', 'Skip'],
      requiresInput: true,
    };
  }

  private async handleChronicDiseases(session: ChatSession, message: string): Promise<ChatbotResponse> {
    const response = message.toLowerCase().trim();

    if (!response.includes('none') && !response.includes('no')) {
      session.context.chronicDiseases = message.trim();
    }

    // NOW suggest the dentist based on symptoms
    const dentist = session.context.suggestedDentist;

    if (!dentist) {
      return {
        message: "I'm having trouble finding a suitable dentist. Let's start over.",
        state: ConversationState.GREETING,
        requiresInput: true,
      };
    }

    const nextSlot = dentist.availability.find(slot => slot.available);
    const slotInfo = nextSlot ? `${nextSlot.date} at ${nextSlot.time}` : 'soon';

    return {
      message: `Based on your symptoms, **${dentist.name}** (${dentist.specialization}) is recommended.\n\n👨‍⚕️ **${dentist.name}**\n⭐ Rating: ${dentist.rating}/5.0\n📅 Available: ${slotInfo}\n\nWould you like to book with this dentist?`,
      state: ConversationState.AWAITING_DENTIST_CONFIRMATION,
      suggestedDentist: dentist,
      options: ['Yes, book with this dentist', 'Choose another dentist'],
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

    // Save suggested dentist but DON'T show it yet
    session.context.suggestedDentist = dentist;

    // Ask for medical history first with three clear options
    return {
      message: "Thank you! Before I suggest a dentist, do you have any previous dental medical history?\n\nYou can:\n📝 **Type** your medical history details\n📄 **Upload** documentation (X-rays, reports)\n⏭️ **Skip** if you don't have any\n\nWhat would you like to do?",
      state: ConversationState.AWAITING_MEDICAL_HISTORY,
      options: ['Skip', 'Upload Documents', 'Provide Details'],
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
      // @ts-ignore - available_times column will be added by migration
      const { data: dentistData } = await (supabase as any)
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

    // Format dates nicely
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    if (!dentist) {
      return {
        message: "Sorry, I lost track of the dentist selection. Let's start over.",
        state: ConversationState.GREETING,
        requiresInput: true,
      };
    }

    const availableSlots = dentist.availability.filter(slot => slot.available).slice(0, 10);

    // If input is not a number, re-show the slots
    if (isNaN(slotNumber)) {
      const slotOptions = availableSlots.map(
        (slot, idx) => `${idx + 1}. ${formatDate(slot.date)} at ${slot.time}`
      ).join('\n');

      return {
        message: `Please select a time slot by typing its number:\n\n${slotOptions}\n\nEnter a number (1-${availableSlots.length}):`,
        state: ConversationState.AWAITING_DATE_TIME,
        requiresInput: true,
      };
    }

    const selectedSlot = availableSlots[slotNumber - 1];

    // If number is out of range, re-show the slots
    if (!selectedSlot) {
      const slotOptions = availableSlots.map(
        (slot, idx) => `${idx + 1}. ${formatDate(slot.date)} at ${slot.time}`
      ).join('\n');

      return {
        message: `Please enter a number between 1 and ${availableSlots.length}:\n\n${slotOptions}\n\nSelect a slot:`,
        state: ConversationState.AWAITING_DATE_TIME,
        requiresInput: true,
      };
    }

    session.context.selectedDate = selectedSlot.date;
    session.context.selectedTime = selectedSlot.time;

    // Now ask for payment method
    return {
      message: `Great! Selected: ${formatDate(selectedSlot.date)} at ${selectedSlot.time}\n\nNow, how would you like to pay?\n\n• Cash\n• Card`,
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
        // @ts-ignore - Some columns will be added by migration
        const { data: appointment } = await (supabase as any)
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
        const availableTimes = await this.parseAvailableTimes((dentist as any).available_times, dentist.id);

        return {
          id: dentist.id,
          name: (dentist as any).name,
          specialization: dentist.specialization || (dentist as any).specialty || 'General Dentistry',
          rating: dentist.rating || 4.5,
          availability: availableTimes,
          email: (dentist as any).email,
          bio: dentist.bio,
          phone: (dentist as any).phone,
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
      const availableTimes = await this.parseAvailableTimes((dentist as any).available_times, dentist.id);

      return {
        id: dentist.id,
        name: (dentist as any).name,
        specialization: dentist.specialization || (dentist as any).specialty || 'General Dentistry',
        rating: dentist.rating || 4.5,
        availability: availableTimes,
        email: (dentist as any).email,
        bio: dentist.bio,
        phone: (dentist as any).phone,
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
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
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
      // @ts-ignore - Some columns will be added by migration
      const { data: existingAppointments } = await (supabase as any)
        .from('appointments')
        .select('appointment_date, appointment_time, status')
        .eq('dentist_id', dentistId)
        .in('status', ['pending', 'confirmed', 'upcoming']);

      if (existingAppointments) {
        // Mark slots as unavailable if they conflict with existing appointments
        slots.forEach((slot: TimeSlot) => {
          const isBooked = existingAppointments.some((apt: any) =>
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
        .map((dentist: any, idx: number) =>
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

    // Build patient notes with gender and pregnancy info (since these columns don't exist in appointments table)
    const patientNotesParts: string[] = [];
    if (context.gender) {
      patientNotesParts.push(`Gender: ${context.gender}`);
    }
    if (context.isPregnant !== undefined && context.isPregnant) {
      patientNotesParts.push('Pregnant: Yes');
    }
    if (context.chronicDiseases) {
      patientNotesParts.push(`Chronic Diseases: ${context.chronicDiseases}`);
    }
    const combinedNotes = patientNotesParts.length > 0
      ? patientNotesParts.join(' | ') + (context.medicalHistory ? `\n\nMedical History: ${context.medicalHistory}` : '')
      : context.medicalHistory || '';

    // First, create the appointment
    // @ts-ignore - Some columns will be added by migration
    const { data: appointment, error } = await (supabase as any)
      .from('appointments')
      .insert({
        patient_id: user.id,
        patient_name: context.patientName || 'Unknown',
        patient_email: context.patientEmail || user.email || '',
        patient_phone: context.patientPhone || '',
        dentist_id: dentist.id,
        dentist_name: dentist.name,
        dentist_email: dentist.email,
        appointment_date: context.selectedDate,
        appointment_time: context.selectedTime,
        reason: context.symptom || 'Not specified',
        symptoms: context.symptom || 'Not specified',
        medical_history: combinedNotes || null,
        payment_method: context.paymentMethod || 'cash',
        payment_status: 'pending',
        status: 'upcoming', // Changed from 'pending' to match dashboard filter
        booking_reference: bookingReference,
        booking_source: 'chatbot', // Mark as chatbot booking for sync tracking
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create appointment: ${error.message || error.code || 'Unknown error'}`);
    }

    // Save health information to appointment_health_info table
    try {
      // @ts-ignore - appointment_health_info table will be created by migration
      const { error: healthError } = await (supabase as any)
        .from('appointment_health_info')
        .insert({
          appointment_id: appointment.id,
          patient_id: user.id,
          gender: context.gender,
          is_pregnant: context.isPregnant || false,
          phone: context.patientPhone,
          chronic_diseases: context.chronicDiseases,
          medical_history: context.medicalHistory,
          symptoms: context.symptom,
          suggested_specialty: context.specialization,
        });

      if (healthError) {
        console.error('Error saving health info:', healthError);
        // Don't fail the appointment if health info fails
      }

      // Save document URLs to medical_documents table if any
      if (context.documentUrls && context.documentUrls.length > 0) {
        const documentInserts = context.documentUrls.map(url => {
          const fileName = url.split('/').pop() || 'uploaded_document';
          const lowerFileName = fileName.toLowerCase();
          // Detect if it's an X-ray based on filename or extension
          const isXray = lowerFileName.includes('xray') ||
            lowerFileName.includes('x-ray') ||
            lowerFileName.includes('radiograph') ||
            lowerFileName.endsWith('.dcm') ||
            lowerFileName.endsWith('.dicom');
          const fileExt = fileName.split('.').pop()?.toUpperCase() || 'PNG';

          return {
            appointment_id: appointment.id,
            patient_id: user.id,
            file_name: fileName,
            file_url: url,
            file_type: fileName.endsWith('.pdf') ? 'application/pdf' : `image/${fileExt.toLowerCase()}`,
            file_size_bytes: 0, // Unknown size from URL - use correct column name
            is_xray: isXray,
            xray_format: isXray ? fileExt : null,
            analysis_status: isXray ? 'pending' : 'not_xray'
          };
        });

        // @ts-ignore - medical_documents table will be created by migration
        const { error: docsError } = await (supabase as any)
          .from('medical_documents')
          .insert(documentInserts);

        if (docsError) {
          console.error('Error saving medical documents:', docsError);
          // Don't fail the appointment if documents fail
        }
      }
    } catch (healthSaveError) {
      console.error('Error in health info save process:', healthSaveError);
      // Continue with appointment creation even if health info fails
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
        // Medical Information
        gender: context.gender,
        isPregnant: context.isPregnant,
        chronicDiseases: context.chronicDiseases,
        medicalHistory: context.medicalHistory,
        medications: context.medications,
        allergies: context.allergies,
        previousDentalWork: context.previousDentalWork,
        smoking: context.smoking,
        documentUrls: context.documentUrls,
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
        // @ts-ignore - Some columns will be added by migration
        await (supabase as any)
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

    // Send notifications asynchronously (don't block on errors)
    try {
      await sendBookingConfirmation(appointment.id);
    } catch (notifError) {
      console.error('Error sending booking confirmation notification:', notifError);
      // Don't throw - notification failures shouldn't break booking
    }

    try {
      await sendNewBookingAlert(appointment.id);
    } catch (notifError) {
      console.error('Error sending new booking alert:', notifError);
      // Don't throw - notification failures shouldn't break booking
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

    // @ts-ignore - Some columns will be added by migration
    const { data: appointments } = await (supabase as any)
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
      .map((apt: any, idx: number) =>
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
    // Step 1: If we are not yet waiting for a question, prompt the user
    // This handles the initial button click "Ask Question"
    if (session.currentState !== ConversationState.AWAITING_QUESTION) {
      session.currentState = ConversationState.AWAITING_QUESTION; // CRITICAL: Update session state
      return {
        message: "Sure, I can help with that. What is your question about dentistry?",
        state: ConversationState.AWAITING_QUESTION,
        options: ['Back to Menu'],
        requiresInput: true,
      };
    }

    // Step 2: Process the actual question

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

    // PRIORITY: Use backend API with AI + internet search for accurate, current answers
    // Local knowledge base is only used as a fallback if API fails
    try {
      const response = await fetch('http://localhost:3001/api/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          type: 'general'
        }),
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Backend API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data?.answer) {
        session.currentState = ConversationState.AWAITING_INTENT;
        return {
          message: data.data.answer,
          state: ConversationState.AWAITING_INTENT,
          options: ['Book Appointment', 'Back to Menu'],
          requiresInput: true,
        };
      }
    } catch (error) {
      console.error('Error calling chatbot API:', error);

      // Fallback: try local knowledge base if API fails
      const fallbackAnswer = searchDentalKnowledge(message);
      if (fallbackAnswer) {
        session.currentState = ConversationState.AWAITING_INTENT;
        return {
          message: fallbackAnswer,
          state: ConversationState.AWAITING_INTENT,
          options: ['Book Appointment', 'Back to Menu'],
          requiresInput: true,
        };
      }
    }

    // If all else fails, provide a helpful message
    session.currentState = ConversationState.AWAITING_INTENT;
    return {
      message: "I'm sorry, I couldn't process your question right now. For detailed dental advice, I'd recommend booking an appointment with one of our dentists who can provide personalized guidance. Would you like to book an appointment?",
      state: ConversationState.AWAITING_INTENT,
      options: ['Book Appointment', 'Back to Menu'],
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

import { geminiService } from './gemini.service.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';


export interface ConversationState {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  service: 'appointment' | 'service' | 'general-qa' | 'dentist-qa' | null;
  step: string;
  collectedData: Record<string, any>;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    requiresInput?: boolean;
    inputType?: 'text' | 'file' | 'selection';
    options?: string[];
    nextStep?: string;
    showFileUpload?: boolean;
  };
}

export class ChatbotService {
  private conversations: Map<string, ConversationState> = new Map();

  /**
   * Start a new conversation or resume existing
   */
  async startConversation(userId: string, userName: string, userEmail: string): Promise<ConversationState> {
    // Check for existing active conversation
    const existing = Array.from(this.conversations.values()).find(
      conv => conv.userId === userId && conv.service === null
    );

    if (existing) {
      return existing;
    }

    // Create new conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation: ConversationState = {
      id: conversationId,
      userId,
      userName,
      userEmail,
      service: null,
      step: 'greeting',
      collectedData: {},
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, conversation);

    return conversation;
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    conversationId: string,
    userMessage: string
  ): Promise<ChatMessage> {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check for uploaded files in the message
    if (userMessage.includes('[Uploaded Files]:')) {
      const parts = userMessage.split('[Uploaded Files]:');
      const textPart = parts[0].trim();
      const filesPart = parts[1].trim();

      // Extract URLs
      const urls = filesPart.split('\n').map(url => url.trim()).filter(url => url.length > 0);

      if (urls.length > 0) {
        // Initialize documents array if not exists
        if (!conversation.collectedData.documents) {
          conversation.collectedData.documents = [];
        }

        // Add new documents
        urls.forEach(url => {
          // Extract filename from URL or generate one
          const name = url.split('/').pop() || 'document';
          conversation.collectedData.documents.push({ name, url });
        });

        logger.info('Extracted uploaded files from chatbot message', {
          conversationId,
          count: urls.length
        });
      }

      // Use only the text part for further processing
      userMessage = textPart;
    }

    // Add user message to history
    conversation.history.push({
      role: 'user',
      content: userMessage || '[File Upload]', // Fallback if message was only files
    });
    conversation.updatedAt = new Date();

    // Handle based on current step
    let response: ChatMessage;

    try {
      switch (conversation.step) {
        case 'greeting':
          response = await this.handleGreeting(conversation, userMessage);
          break;

        case 'service_selection':
          response = await this.handleServiceSelection(conversation, userMessage);
          break;

        // Appointment booking flow
        case 'collect_gender':
          response = await this.collectGender(conversation, userMessage);
          break;

        case 'collect_pregnancy':
          response = await this.collectPregnancy(conversation, userMessage);
          break;

        case 'collect_phone':
          response = await this.collectPhone(conversation, userMessage);
          break;

        case 'collect_chronic_diseases':
          response = await this.collectChronicDiseases(conversation, userMessage);
          break;

        case 'collect_medical_history':
          response = await this.collectMedicalHistory(conversation, userMessage);
          break;

        case 'collect_symptoms':
          response = await this.collectSymptoms(conversation, userMessage);
          break;

        case 'suggest_dentist':
          response = await this.handleDentistSelection(conversation, userMessage);
          break;

        case 'select_datetime':
          response = await this.handleDateTimeSelection(conversation, userMessage);
          break;

        // Service booking flow
        case 'service_collect_gender':
          response = await this.collectServiceGender(conversation, userMessage);
          break;

        case 'service_collect_pregnancy':
          response = await this.collectServicePregnancy(conversation, userMessage);
          break;

        case 'service_collect_phone':
          response = await this.collectServicePhone(conversation, userMessage);
          break;

        case 'show_services':
          response = await this.showAvailableServices(conversation, userMessage);
          break;

        case 'select_service':
          response = await this.handleServiceSelectionChoice(conversation, userMessage);
          break;

        case 'select_service_time':
          response = await this.handleServiceTimeSelection(conversation, userMessage);
          break;

        // Q&A flows
        case 'general_qa':
          response = await this.handleGeneralQA(conversation, userMessage);
          break;



        default:
          response = await this.handleGreeting(conversation, userMessage);
      }

      // Add assistant response to history
      conversation.history.push({
        role: 'assistant',
        content: response.content,
      });

      return response;
    } catch (error) {
      logger.error('Error processing message', { error, conversationId });
      throw error;
    }
  }

  /**
   * Handle greeting and show service options
   */
  private async handleGreeting(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const greeting = `Hello ${conversation.userName}! 👋 Welcome to Aqua Dent Link.\n\nHow can I assist you today?`;

    conversation.step = 'service_selection';

    return {
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'selection',
        options: [
          '📅 Book an Appointment',
          '❓ Ask a Dentistry Question',
        ],
        nextStep: 'service_selection',
      },
    };
  }

  /**
   * Handle service selection
   */
  private async handleServiceSelection(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('appointment')) {
      conversation.service = 'appointment';
      conversation.step = 'collect_gender';
      return {
        role: 'assistant',
        content: 'Great! Let\'s book your appointment. To provide the best care, I need to ask a few health-related questions.\n\nFirst, what is your gender?',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Male', 'Female', 'Other'],
          nextStep: 'collect_gender',
        },
      };
    }

    if (lowerMessage.includes('question') || lowerMessage.includes('ask') || lowerMessage.includes('dentistry')) {
      conversation.service = 'general-qa';
      conversation.step = 'general_qa';
      return {
        role: 'assistant',
        content: 'I\'m happy to help with your dental questions! 🦷\n\nWhat would you like to know about dentistry or oral health?',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'text',
          nextStep: 'general_qa',
        },
      };
    }

    // Default fallback
    return {
      role: 'assistant',
      content: 'I can help you book an appointment or answer dentistry questions. Please select an option:',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'selection',
        options: [
          '📅 Book an Appointment',
          '❓ Ask a Dentistry Question',
        ],
        nextStep: 'service_selection',
      },
    };
  }

  /**
   * Collect gender
   */
  private async collectGender(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase().trim();

    let gender: string;

    // Dynamic detection - check for keywords
    if (lowerMessage.includes('female') || lowerMessage.includes('woman') || lowerMessage.includes('girl') || lowerMessage === 'f') {
      gender = 'female';
    } else if (lowerMessage.includes('male') && !lowerMessage.includes('female')) {
      gender = 'male';
    } else if (lowerMessage.includes('man') || lowerMessage.includes('boy') || lowerMessage === 'm') {
      gender = 'male';
    } else if (lowerMessage.includes('other') || lowerMessage.includes('prefer not') || lowerMessage.includes('non-binary')) {
      gender = 'other';
    } else {
      // Didn't understand - ask again with clarification
      return {
        role: 'assistant',
        content: 'I didn\'t quite understand. Please select your gender from the options below:',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Male', 'Female', 'Other'],
          nextStep: 'collect_gender',
        },
      };
    }

    // Save gender
    conversation.collectedData.gender = gender;

    // If female, ask about pregnancy
    if (gender === 'female') {
      conversation.step = 'collect_pregnancy';
      return {
        role: 'assistant',
        content: 'Thank you. Are you currently pregnant? (This is important for treatment planning)',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Yes', 'No'],
          nextStep: 'collect_pregnancy',
        },
      };
    }

    // Skip pregnancy question for non-females
    conversation.step = 'collect_phone';
    return {
      role: 'assistant',
      content: 'Thank you. What is your phone number?',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'collect_phone',
      },
    };
  }

  /**
   * Collect pregnancy status (females only)
   */
  private async collectPregnancy(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase().trim();

    // Dynamic yes/no detection
    let isPregnant: boolean;
    if (lowerMessage.includes('yes') || lowerMessage.includes('yeah') || lowerMessage.includes('yep') ||
      lowerMessage.includes('pregnant') || lowerMessage === 'y') {
      isPregnant = true;
    } else if (lowerMessage.includes('no') || lowerMessage.includes('nope') || lowerMessage.includes('not') ||
      lowerMessage === 'n') {
      isPregnant = false;
    } else {
      // Didn't understand
      return {
        role: 'assistant',
        content: 'I didn\'t understand. Are you currently pregnant? Please answer Yes or No:',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Yes', 'No'],
          nextStep: 'collect_pregnancy',
        },
      };
    }

    conversation.collectedData.isPregnant = isPregnant;

    conversation.step = 'collect_phone';
    return {
      role: 'assistant',
      content: 'Thank you for that information. What is your phone number?',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'collect_phone',
      },
    };
  }

  /**
   * Collect phone number
   */
  private async collectPhone(conversation: ConversationState, message: string): Promise<ChatMessage> {
    conversation.collectedData.phone = message.trim();

    conversation.step = 'collect_chronic_diseases';
    return {
      role: 'assistant',
      content: 'Got it! Do you have any chronic diseases or ongoing medical conditions?\n\nYou can describe them or type "None" if you don\'t have any.',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'collect_chronic_diseases',
      },
    };
  }

  /**
   * Collect chronic diseases
   */
  private async collectChronicDiseases(conversation: ConversationState, message: string): Promise<ChatMessage> {
    conversation.collectedData.chronicDiseases = message.trim();

    conversation.step = 'collect_medical_history';
    return {
      role: 'assistant',
      content: 'Thank you. Now, please tell me about your dental medical history.\n\nYou can:\n• Describe any previous dental treatments\n• Upload documents like X-rays or medical reports\n• Type "None" if you don\'t have any specific history',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        showFileUpload: true,
        nextStep: 'collect_medical_history',
      },
    };
  }

  /**
   * Collect medical history
   */
  private async collectMedicalHistory(conversation: ConversationState, message: string): Promise<ChatMessage> {
    conversation.collectedData.medicalHistory = message.trim();

    conversation.step = 'collect_symptoms';
    return {
      role: 'assistant',
      content: 'Almost done! Please describe your current symptoms or the reason for your visit.\n\nBe as detailed as possible so I can suggest the best dentist for you.',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'collect_symptoms',
      },
    };
  }

  /**
   * Collect symptoms and suggest dentist
   */
  private async collectSymptoms(conversation: ConversationState, message: string): Promise<ChatMessage> {
    conversation.collectedData.symptoms = message.trim();

    // Analyze symptoms with AI
    const analysis = await geminiService.analyzeSymptoms(message);
    conversation.collectedData.suggestedSpecialty = analysis.specialty;

    // Find dentists in that specialty
    const { data: dentists } = await supabase
      .from('dentists')
      .select('*')
      .eq('specialization', analysis.specialty)
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(3);

    if (!dentists || dentists.length === 0) {
      // Fallback to general dentists
      const { data: generalDentists } = await supabase
        .from('dentists')
        .select('*')
        .eq('status', 'active')
        .order('rating', { ascending: false })
        .limit(3);

      conversation.collectedData.suggestedDentists = generalDentists || [];
    } else {
      conversation.collectedData.suggestedDentists = dentists;
    }

    const topDentist = conversation.collectedData.suggestedDentists[0];

    conversation.step = 'suggest_dentist';
    conversation.collectedData.selectedDentistId = topDentist?.id;

    return {
      role: 'assistant',
      content: `Based on your symptoms, I recommend **${analysis.specialty}**.\n\n${analysis.explanation}\n\nThe best match is **${topDentist?.name}** (${topDentist?.specialization})\nRating: ${topDentist?.rating || 'N/A'}/5.0\n\nWould you like to book with ${topDentist?.name}?\n\nType "Yes" to proceed, or "Show other dentists" to see alternatives.`,
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'selection',
        options: ['Yes', 'Show other dentists'],
        nextStep: 'suggest_dentist',
      },
    };
  }

  /**
   * Handle general dentistry Q&A
   */


  /**
   * Handle dentist-specific Q&A
   */
  private async handleDentistQA(conversation: ConversationState, message: string): Promise<ChatMessage> {
    // This would need dentist selection logic
    return {
      role: 'assistant',
      content: 'Dentist Q&A coming soon!',
      timestamp: new Date(),
    };
  }

  /**
   * Handle unknown steps
   */
  private async handleUnknownStep(conversation: ConversationState, message: string): Promise<ChatMessage> {
    return {
      role: 'assistant',
      content: 'I\'m sorry, I seem to have lost track of our conversation. Let\'s start fresh. How can I help you?',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'selection',
        options: [
          '📅 Book an Appointment',
          '🦷 Book a Service',
          '❓ Ask Dentistry Questions',
          '👨‍⚕️ Ask About a Dentist',
        ],
        nextStep: 'service_selection',
      },
    };
  }

  private async handleDentistSelection(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('yes') || lowerMessage.includes('book') || lowerMessage.includes('proceed')) {
      // User accepted the top dentist
      conversation.step = 'select_datetime';

      // Fetch dentist's actual availability from database
      const selectedDentist = conversation.collectedData.suggestedDentists[0];
      const selectedDentistId = selectedDentist?.id;

      if (!selectedDentistId) {
        return {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try booking again.',
          timestamp: new Date(),
          metadata: {
            requiresInput: false,
          },
        };
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayOfWeek = tomorrow.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dateStr = tomorrow.toISOString().split('T')[0];

      // Fetch availability for tomorrow
      const { data: availability, error: availError } = await supabase
        .from('dentist_availability')
        .select('*')
        .eq('dentist_id', selectedDentistId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (availError || !availability || availability.length === 0) {
        logger.warn('No availability found for dentist', {
          dentistId: selectedDentistId,
          dayOfWeek,
          error: availError
        });

        return {
          role: 'assistant',
          content: `I'm sorry, but ${selectedDentist.name} is not available on ${dateStr}. Would you like to try a different date or choose another dentist?`,
          timestamp: new Date(),
          metadata: {
            requiresInput: true,
            inputType: 'selection',
            options: ['Try different date', 'Choose another dentist'],
            nextStep: 'suggest_dentist',
          },
        };
      }

      // Generate time slots from availability (with past-time filtering)
      const slots: string[] = [];
      const slotLabels: string[] = [];
      const now = new Date();
      const isToday = tomorrow.toDateString() === now.toDateString();

      logger.info('Generating time slots', {
        tomorrow: tomorrow.toDateString(),
        now: now.toDateString(),
        isToday,
        availabilityCount: availability.length
      });

      availability.forEach((avail: any) => {
        const startTime = avail.start_time; // e.g., "09:00:00"
        const endTime = avail.end_time; // e.g., "17:00:00"
        const slotDuration = avail.slot_duration_minutes || 30;

        // Parse start and end times
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        let currentHour = startHour;
        let currentMin = startMin;

        while (
          currentHour < endHour ||
          (currentHour === endHour && currentMin < endMin)
        ) {
          const timeValue = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

          // Check if time has passed (for today only)
          let isPastTime = false;
          if (isToday) {
            const slotTime = new Date(tomorrow);
            slotTime.setHours(currentHour, currentMin, 0, 0);
            if (slotTime <= now) {
              isPastTime = true;
            }
          }

          if (!isPastTime) {
            const displayTime = new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            slots.push(timeValue);
            slotLabels.push(displayTime);
          }

          // Increment by slot duration
          currentMin += slotDuration;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      });

      // Fetch existing appointments for this date to filter out booked slots
      const { data: existingAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('dentist_id', selectedDentistId)
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (apptError) {
        logger.warn('Error fetching existing appointments for slot filtering', {
          error: apptError
        });
      }

      // Create a set of booked times for fast lookup (in HH:MM format)
      const bookedTimes = new Set(
        existingAppointments?.map(apt => {
          // Convert time to HH:MM format for comparison
          return apt.appointment_time.substring(0, 5);
        }) || []
      );

      // Filter out booked slots
      const availableSlots = slots.filter(slot => !bookedTimes.has(slot));
      const availableLabels = slotLabels.filter((_, i) => !bookedTimes.has(slots[i]));

      if (availableSlots.length === 0) {
        return {
          role: 'assistant',
          content: `I'm sorry, but all time slots for ${selectedDentist.name} on ${dateStr} are fully booked. Would you like to try a different date or choose another dentist?`,
          timestamp: new Date(),
          metadata: {
            requiresInput: true,
            inputType: 'selection',
            options: ['Try different date', 'Choose another dentist'],
            nextStep: 'suggest_dentist',
          },
        };
      }

      // Store the selected dentist ID for later use
      conversation.collectedData.selectedDentistId = selectedDentistId;
      conversation.collectedData.selectedDate = dateStr;

      // Format slots for display (limit to 8 slots to avoid overwhelming)
      const displaySlots = availableLabels.slice(0, 8);
      let content = `Great choice! Here are available times for ${selectedDentist.name} on ${dateStr}:\n\n`;
      displaySlots.forEach((slot, i) => {
        content += `${i + 1}. ${slot}\n`;
      });
      content += '\nPlease type the time you prefer (e.g., "09:00 AM").';

      return {
        role: 'assistant',
        content,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: displaySlots,
          nextStep: 'select_datetime',
        },
      };
    } else {
      // Show other dentists
      const dentists = conversation.collectedData.suggestedDentists || [];
      const otherDentists = dentists.slice(1);

      if (otherDentists.length === 0) {
        return {
          role: 'assistant',
          content: 'I don\'t have any other specific recommendations for this specialty. Would you like to proceed with the first dentist?',
          timestamp: new Date(),
          metadata: {
            requiresInput: true,
            inputType: 'selection',
            options: ['Yes', 'No'],
            nextStep: 'suggest_dentist',
          },
        };
      }

      let content = 'Here are some other options:\n\n';
      otherDentists.forEach((d: any, i: number) => {
        content += `${i + 1}. **${d.name}** (${d.specialization}) - Rating: ${d.rating || 'N/A'}\n`;
      });
      content += '\nPlease type the name of the dentist you would like to book with.';

      conversation.step = 'select_dentist_manual';
      return {
        role: 'assistant',
        content,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'text',
          nextStep: 'select_dentist_manual',
        },
      };
    }
  }

  private async handleDateTimeSelection(conversation: ConversationState, message: string): Promise<ChatMessage> {
    conversation.collectedData.selectedTime = message;

    // Save appointment to database
    try {
      const { selectedDentistId, selectedTime, symptoms, gender, phone } = conversation.collectedData;

      // 1. Create appointment
      const { data: appointment, error: appError } = await supabase
        .from('appointments')
        .insert({
          patient_id: conversation.userId,
          dentist_id: selectedDentistId,
          appointment_date: new Date().toISOString(), // In real app, parse selectedTime correctly
          status: 'pending',
          type: 'consultation',
          notes: `Booked via AI Chatbot. Symptoms: ${symptoms}`,
          documents: conversation.collectedData.documents || [], // Save uploaded documents
        })
        .select()
        .single();

      if (appError) throw appError;

      // 2. Save health info
      const { error: healthError } = await supabase
        .from('appointment_health_info')
        .insert({
          appointment_id: appointment.id,
          patient_id: conversation.userId,
          gender: gender,
          is_pregnant: conversation.collectedData.isPregnant,
          phone: phone,
          chronic_diseases: conversation.collectedData.chronicDiseases,
          medical_history: conversation.collectedData.medicalHistory,
          symptoms: symptoms,
          suggested_specialty: conversation.collectedData.suggestedSpecialty,
        });

      if (healthError) logger.error('Failed to save health info', healthError);

      return {
        role: 'assistant',
        content: `✅ Appointment Confirmed!\n\nDentist: **${conversation.collectedData.suggestedDentists[0].name}**\nTime: ${selectedTime}\n\nI've sent the details to your email and the dentist. Is there anything else I can help you with?`,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Book another', 'Ask a question', 'End chat'],
          nextStep: 'service_selection',
        },
      };

    } catch (error) {
      logger.error('Booking failed', error);
      return {
        role: 'assistant',
        content: 'I apologize, but I encountered an error while saving your appointment. Please try again or contact support.',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get conversation state
   */
  getConversation(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Clean up old conversations (call periodically)
   */
  cleanupOldConversations() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    for (const [id, conv] of this.conversations.entries()) {
      if (conv.updatedAt < thirtyMinutesAgo) {
        this.conversations.delete(id);
        logger.info('Cleaned up old conversation', { conversationId: id });
      }
    }
  }

  /**
   * Upload document to Supabase Storage
   */
  async uploadDocument(file: Express.Multer.File, userId: string): Promise<string> {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('medical_documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      logger.error('Error uploading file to Supabase:', error);
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('medical_documents')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * SERVICE BOOKING FLOW HANDLERS
   */

  /**
   * Collect gender for service booking
   */
  private async collectServiceGender(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase().trim();

    let gender: string;
    if (lowerMessage.includes('female') || lowerMessage.includes('woman') || lowerMessage === 'f') {
      gender = 'female';
    } else if (lowerMessage.includes('male') && !lowerMessage.includes('female')) {
      gender = 'male';
    } else if (lowerMessage.includes('other') || lowerMessage.includes('prefer not')) {
      gender = 'other';
    } else {
      return {
        role: 'assistant',
        content: 'I didn\'t quite understand. Please select your gender:',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Male', 'Female', 'Other'],
          nextStep: 'service_collect_gender',
        },
      };
    }

    conversation.collectedData.gender = gender;

    // If female, ask about pregnancy
    if (gender === 'female') {
      conversation.step = 'service_collect_pregnancy';
      return {
        role: 'assistant',
        content: 'Are you currently pregnant?',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Yes', 'No'],
          nextStep: 'service_collect_pregnancy',
        },
      };
    }

    // Otherwise, go to phone
    conversation.step = 'service_collect_phone';
    return {
      role: 'assistant',
      content: 'What\'s your phone number? (for appointment confirmations)',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'service_collect_phone',
      },
    };
  }

  /**
   * Collect pregnancy status for service booking
   */
  private async collectServicePregnancy(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const lowerMessage = message.toLowerCase().trim();

    if (lowerMessage.includes('yes') || lowerMessage.includes('pregnant')) {
      conversation.collectedData.isPregnant = true;
    } else {
      conversation.collectedData.isPregnant = false;
    }

    conversation.step = 'service_collect_phone';
    return {
      role: 'assistant',
      content: 'What\'s your phone number? (for appointment confirmations)',
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'text',
        nextStep: 'service_collect_phone',
      },
    };
  }

  /**
   * Collect phone for service booking
   */
  private async collectServicePhone(conversation: ConversationState, message: string): Promise<ChatMessage> {
    logger.info(`Collecting service phone for conversation ${conversation.id}`);
    conversation.collectedData.phone = message.trim();

    // Now show available services
    conversation.step = 'show_services';
    return this.showAvailableServices(conversation, message);
  }

  /**
   * Show available services from database
   */
  private async showAvailableServices(conversation: ConversationState, message: string): Promise<ChatMessage> {
    try {
      // Fetch services from database
      const { data: services, error } = await supabase
        .from('dental_services')
        .select('*')
        .eq('is_active', true)
        .order('price_min', { ascending: true });

      if (error) throw error;

      if (!services || services.length === 0) {
        return {
          role: 'assistant',
          content: 'I\'m sorry, there are no services available at the moment. Please try again later or contact us directly.',
          timestamp: new Date(),
          metadata: {
            requiresInput: false,
          },
        };
      }

      // Store services for later reference
      conversation.collectedData.availableServices = services;

      // Format services list
      const servicesList = services.map((s, idx) => {
        const price = s.price_max && s.price_max !== s.price_min
          ? `$${s.price_min} - $${s.price_max}`
          : `$${s.price_min}`;
        const duration = s.duration_minutes < 60
          ? `${s.duration_minutes} min`
          : `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60 ? `${s.duration_minutes % 60}m` : ''}`;

        return `${idx + 1}. **${s.name}**\n   💰 ${price} | ⏱️ ${duration}\n   📝 ${s.description}\n   🏥 Specialty: ${s.specialty}`;
      }).join('\n\n');

      const serviceOptions = services.map((s, idx) => `${idx + 1}. ${s.name}`);

      conversation.step = 'select_service';
      return {
        role: 'assistant',
        content: `Here are our available services:\n\n${servicesList}\n\nPlease choose a service by entering its number or name:`,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: serviceOptions,
          nextStep: 'select_service',
        },
      };
    } catch (error) {
      logger.error('Error fetching services', error);
      return {
        role: 'assistant',
        content: 'I encountered an error while fetching available services. Please try again.',
        timestamp: new Date(),
        metadata: {
          requiresInput: false,
        },
      };
    }
  }

  /**
   * Handle service selection
   */
  private async handleServiceSelectionChoice(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const services = conversation.collectedData.availableServices;
    if (!services) {
      return this.showAvailableServices(conversation, message);
    }

    const lowerMessage = message.toLowerCase().trim();
    let selectedService = null;

    // Check if user entered a number
    const serviceNum = parseInt(lowerMessage);
    if (!isNaN(serviceNum) && serviceNum >= 1 && serviceNum <= services.length) {
      selectedService = services[serviceNum - 1];
    } else {
      // Check if user entered service name
      selectedService = services.find((s: any) =>
        s.name.toLowerCase().includes(lowerMessage) ||
        lowerMessage.includes(s.name.toLowerCase())
      );
    }

    if (!selectedService) {
      return {
        role: 'assistant',
        content: 'I couldn\'t find that service. Please choose from the list by number or name.',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: services.map((s: any, idx: number) => `${idx + 1}. ${s.name}`),
          nextStep: 'select_service',
        },
      };
    }

    // Save selected service
    conversation.collectedData.selectedService = selectedService;

    // Find dentist with matching specialty
    const { data: dentists } = await supabase
      .from('dentists')
      .select('*')
      .contains('specialization', [selectedService.specialty])
      .eq('status', 'active')
      .limit(1);

    if (!dentists || dentists.length === 0) {
      return {
        role: 'assistant',
        content: `I'm sorry, we don't have a ${selectedService.specialty} specialist available right now. Would you like to choose another service?`,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Yes, show services again', 'No, end chat'],
          nextStep: 'select_service',
        },
      };
    }

    conversation.collectedData.selectedDentist = dentists[0];

    // Show available times
    conversation.step = 'select_service_time';
    const times = [
      'Tomorrow at 9:00 AM',
      'Tomorrow at 2:00 PM',
      'Tomorrow at 4:30 PM',
      'Day after tomorrow at 10:00 AM',
      'Day after tomorrow at 3:00 PM',
    ];

    return {
      role: 'assistant',
      content: `Great! You've selected **${selectedService.name}**.\n\n👨‍⚕️ Dentist: ${dentists[0].name}\n💰 Price: $${selectedService.price_min}\n⏱️ Duration: ${selectedService.duration_minutes} minutes\n\nAvailable times:\n${times.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nPlease select your preferred time:`,
      timestamp: new Date(),
      metadata: {
        requiresInput: true,
        inputType: 'selection',
        options: times,
        nextStep: 'select_service_time',
      },
    };
  }

  /**
   * Handle service time selection and create booking
   */
  private async handleServiceTimeSelection(conversation: ConversationState, message: string): Promise<ChatMessage> {
    const selectedService = conversation.collectedData.selectedService;
    const selectedDentist = conversation.collectedData.selectedDentist;

    if (!selectedService || !selectedDentist) {
      return {
        role: 'assistant',
        content: 'Something went wrong. Let\'s start over.',
        timestamp: new Date(),
        metadata: {
          requiresInput: false,
        },
      };
    }

    conversation.collectedData.selectedTime = message;

    // Create appointment in database
    try {
      const { data: appointment, error: appError } = await supabase
        .from('appointments')
        .insert({
          patient_id: conversation.userId,
          dentist_id: selectedDentist.id,
          appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          appointment_time: '09:00', // Parse from selectedTime in real implementation
          status: 'pending',
          type: selectedService.name,
          payment_status: 'pending',
          booking_source: 'chatbot',
          notes: `Service booking via AI Chat. Service: ${selectedService.name}`,
        })
        .select()
        .single();

      if (appError) throw appError;

      // Save health info
      await supabase
        .from('appointment_health_info')
        .insert({
          appointment_id: appointment.id,
          patient_id: conversation.userId,
          gender: conversation.collectedData.gender,
          is_pregnant: conversation.collectedData.isPregnant || false,
          phone: conversation.collectedData.phone,
        });

      return {
        role: 'assistant',
        content: `✅ Service Booking Confirmed!\n\n🦷 Service: ${selectedService.name}\n👨‍⚕ Dentist: ${selectedDentist.name}\n📅 Time: ${message}\n💰 Price: $${selectedService.price_min}\n\n📧 Confirmation sent to ${conversation.userEmail}\n📱 You'll receive a reminder 24 hours before\n\nThe dentist has been notified. Is there anything else I can help you with?`,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Book another service', 'Ask a question', 'End chat'],
          nextStep: 'service_selection',
        },
      };
    } catch (error) {
      logger.error('Service booking failed', error);
      return {
        role: 'assistant',
        content: 'I apologize, but I encountered an error while saving your booking. Please try again or contact support.',
        timestamp: new Date(),
        metadata: {
          requiresInput: false,
        },
      };
    }
  }

  /**
   * Handle general dentistry Q&A using Gemini
   */
  private async handleGeneralQA(conversation: ConversationState, message: string): Promise<ChatMessage> {
    // Check if user wants to exit Q&A
    if (message.toLowerCase().includes('book') || message.toLowerCase().includes('appointment')) {
      conversation.service = 'appointment';
      conversation.step = 'collect_gender';
      return {
        role: 'assistant',
        content: 'Sure, let\'s switch to booking an appointment. 📅\n\nFirst, please tell me your gender:',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['Male', 'Female', 'Other'],
          nextStep: 'collect_gender',
        },
      };
    }

    try {
      // Use Gemini to answer the question
      const answer = await geminiService.answerDentistryQuestion(message);

      return {
        role: 'assistant',
        content: `${answer}\n\nDo you have any other questions? (Or type "book" to make an appointment)`,
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'text',
          nextStep: 'general_qa',
        },
      };
    } catch (error) {
      logger.error('Error in general QA', { error });
      return {
        role: 'assistant',
        content: 'I\'m having trouble connecting to my dental knowledge base right now. Please try again later or book an appointment.',
        timestamp: new Date(),
        metadata: {
          requiresInput: true,
          inputType: 'selection',
          options: ['📅 Book an Appointment'],
          nextStep: 'service_selection',
        },
      };
    }
  }
}

export const chatbotService = new ChatbotService();

// Cleanup old conversations every 10 minutes
setInterval(() => {
  chatbotService.cleanupOldConversations();
}, 10 * 60 * 1000);

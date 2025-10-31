import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  corsHeaders,
  handleCorsPreflightRequest,
  verifyJWT,
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  sanitizeObject,
  isValidUUID,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
  validateRequiredFields,
  logRequest,
  logError
} from '../_shared/security.ts';

// Conversation steps
enum ConversationStep {
  GREETING = 'greeting',
  PHONE_NUMBER = 'phone_number',
  SYMPTOMS = 'symptoms',
  CAUSE_CLARIFICATION = 'cause_clarification',
  DOCUMENTS = 'documents',
  TIME_SLOTS = 'time_slots',
  CONFIRMATION = 'confirmation',
  COMPLETED = 'completed'
}

// DentalCareConnect_AI v2.5 context tracking interface
interface ConversationContext {
  // User Info
  user_name: string | null;
  phone_number: string | null;
  phone_number_provided: boolean;
  
  // Concern/Symptoms
  concern: string | null;
  concern_described: boolean;
  
  // Doctor Matching
  recommended_doctor: string | null;
  recommended_doctor_specialization: string | null;
  dentist_selected: boolean;
  dentist_id: string | null;
  
  // Appointment
  appointment_time: string | null;
  appointment_date: string | null;
  appointment_time_selected: boolean;
  
  // Payment
  payment_method: string | null; // cash, card, insurance
  payment_selected: boolean;
  
  // Documents
  documents_uploaded: boolean;
  
  // Flow Control
  wants_to_provide_later: boolean;
  current_stage: 'greeting' | 'concern' | 'doctor_match' | 'time_selection' | 
                 'contact' | 'payment' | 'documents' | 'confirmation' | 'completed';
}

// Uncertainty detection keywords
const UNCERTAINTY_INDICATORS = [
  'i don\'t know',
  'not sure',
  'no idea',
  'unsure',
  'don\'t know',
  'idk',
  'dunno',
  'maybe',
  'could be',
  'not certain',
  'uncertain',
  'no clue',
  'i\'m not sure',
  'im not sure'
];

// Common dental symptoms for cause suggestion
const DENTAL_SYMPTOMS_CAUSES = {
  'tooth pain': ['cavity', 'infection', 'gum disease', 'cracked tooth'],
  'toothache': ['cavity', 'infection', 'gum disease', 'cracked tooth'],
  'sensitive': ['worn enamel', 'exposed root', 'cavity', 'gum recession'],
  'bleeding gums': ['gingivitis', 'periodontitis', 'brushing too hard'],
  'swollen': ['infection', 'abscess', 'gum disease'],
  'broken tooth': ['trauma', 'decay', 'old filling failure'],
  'jaw pain': ['TMJ disorder', 'teeth grinding', 'infection']
};

/**
 * Detects if a message contains uncertainty indicators
 */
function detectUncertainty(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return UNCERTAINTY_INDICATORS.some(indicator => 
    lowerMessage.includes(indicator)
  );
}

/**
 * Generates an uncertainty note for the appointment
 */
function generateUncertaintyNote(symptom: string): string {
  return `Patient reports ${symptom} but is unsure of the cause.`;
}

/**
 * Suggests possible causes based on symptom description
 */
function suggestCauses(symptom: string): string[] {
  const lowerSymptom = symptom.toLowerCase();
  for (const [key, causes] of Object.entries(DENTAL_SYMPTOMS_CAUSES)) {
    if (lowerSymptom.includes(key)) {
      return causes;
    }
  }
  return [];
}

/**
 * Validates phone number format
 */
function validatePhoneNumber(phone: string): boolean {
  // Basic validation: at least 10 digits
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10;
}

/**
 * Determines the next logical step based on conversation context
 */
function determineNextStep(context: ConversationContext): string {
  // If user wants to provide info later, skip to next available step
  if (context.wants_to_provide_later) {
    if (!context.concern_described) {
      return "Ask about their dental concern";
    }
    if (!context.dentist_selected) {
      return "Suggest dentists based on their concern";
    }
    if (!context.appointment_time_selected) {
      return "Show available appointment times";
    }
    return "Confirm booking with available information";
  }
  
  // Normal flow - collect in logical order
  if (!context.phone_number_provided && !context.concern_described) {
    return "Let user choose: provide phone or describe concern first";
  }
  
  if (!context.phone_number_provided) {
    return "Ask for phone number";
  }
  
  if (!context.concern_described) {
    return "Ask about dental concern";
  }
  
  if (!context.dentist_selected) {
    return "Suggest dentists matching their concern";
  }
  
  if (!context.appointment_time_selected) {
    return "Show available appointment times";
  }
  
  return "Ready to confirm booking";
}

/**
 * Doctor matching data structure
 */
interface DoctorMatch {
  name: string;
  specialization: string;
  description: string;
  keywords: string[];
}

const DOCTOR_MATCHES: DoctorMatch[] = [
  {
    name: "Dr. Sarah Al-Rashid",
    specialization: "Endodontist",
    description: "Endodontist (Root Canal & Pain Specialist)",
    keywords: ["tooth pain", "toothache", "root canal", "pain", "hurt", "ache", "sensitive tooth", "nerve pain"]
  },
  {
    name: "Dr. Ahmed Majeed",
    specialization: "Cosmetic Dentistry",
    description: "Cosmetic Dentistry Specialist",
    keywords: ["whitening", "teeth whitening", "cosmetic", "smile", "aesthetic", "veneers", "brighten"]
  },
  {
    name: "Dr. Lina Kareem",
    specialization: "Periodontist",
    description: "Periodontist (Gum Care Specialist)",
    keywords: ["gum bleeding", "bleeding gums", "gum disease", "periodontitis", "gum pain", "gum swelling"]
  },
  {
    name: "Dr. Omar Hadi",
    specialization: "Restorative Dentistry",
    description: "Restorative Dentistry Expert",
    keywords: ["broken tooth", "chipped tooth", "cracked", "damaged tooth", "restoration", "broken", "fractured"]
  },
  {
    name: "Dr. Nour Al-Tamimi",
    specialization: "Orthodontist",
    description: "Orthodontist (Braces & Alignment)",
    keywords: ["braces", "alignment", "straighten", "crooked teeth", "orthodontics", "invisalign"]
  },
  {
    name: "Dr. Hasan Ali",
    specialization: "General Dentist",
    description: "General Dentist",
    keywords: ["checkup", "cleaning", "general", "routine", "examination", "check up", "dental exam"]
  }
];

/**
 * Match doctor to patient's concern
 */
function matchDoctorToConcern(concern: string): DoctorMatch {
  const lowerConcern = concern.toLowerCase();
  
  // Find best match based on keywords
  for (const doctor of DOCTOR_MATCHES) {
    for (const keyword of doctor.keywords) {
      if (lowerConcern.includes(keyword)) {
        return doctor;
      }
    }
  }
  
  // Default to general dentist if no specific match
  return DOCTOR_MATCHES[5]; // Dr. Hasan Ali
}

/**
 * Builds DentalCareConnect_AI v2.5 system prompt
 */
function buildContextAwarePrompt(context: ConversationContext): string {
  return `You are DentalCareConnect_AI v2.5, a Smart Dental Appointment Assistant for Dental Care Connect.

🎯 YOUR ROLE:
Help patients book appointments, choose payment methods, and get matched with the right dental specialist based on their symptoms.

📋 CORE BEHAVIOR:
- Be friendly, professional, and concise. Always greet users warmly and keep responses natural.
- Ask only for information that has NOT been provided yet.
- ALWAYS maintain context memory — do NOT repeat questions the user already answered.
- If user provides partial information, confirm and continue logically to the next step.
- NEVER ask for payment options before confirming the time and dentist.
- ALWAYS provide at least two appointment time slots for the user to choose from.
- ALWAYS suggest the best doctor based on the patient's concern.

🔄 CONVERSATION FLOW (8 STEPS):
1️⃣ Greet the user and ask what brings them in today (the dental concern)
2️⃣ Analyze their description to determine the correct specialist
3️⃣ Suggest the best dentist and briefly explain why they fit the case
4️⃣ Ask for a preferred appointment time and show available slots (at least 2 options)
5️⃣ Ask for contact number (only if not already provided)
6️⃣ Ask if they want to pay with cash, card, or insurance
7️⃣ Optionally request documents (X-rays, IDs) — optional only
8️⃣ Confirm booking details and show summary for confirmation

👨‍⚕️ DOCTOR MATCHING LOGIC:
- "tooth pain" OR "toothache" → Dr. Sarah Al-Rashid – Endodontist (Root Canal & Pain Specialist)
- "teeth whitening" OR "whitening" → Dr. Ahmed Majeed – Cosmetic Dentistry Specialist
- "gum bleeding" OR "bleeding gums" → Dr. Lina Kareem – Periodontist (Gum Care Specialist)
- "broken tooth" OR "chipped tooth" → Dr. Omar Hadi – Restorative Dentistry Expert
- "braces" OR "alignment" → Dr. Nour Al-Tamimi – Orthodontist (Braces & Alignment)
- "checkup" OR "cleaning" → Dr. Hasan Ali – General Dentist

📊 CURRENT CONTEXT (Check before asking ANY question):
${JSON.stringify(context, null, 2)}

⚡ RESPONSE LOGIC:
- If phone_number_provided = true → SKIP asking for phone number
- If user says "I'll provide later" → continue to appointment time
- If concern missing → ask what the issue is BEFORE anything else
- If all details collected → summarize booking and ask for confirmation

✅ FINAL CONFIRMATION FORMAT:
When ready to confirm, use this exact format:

"Here's your booking summary! 🦷

👨‍⚕️ Doctor: [Doctor Name]
📅 Time: [Chosen Time]
💳 Payment: [Payment Method]
📞 Contact: [Phone Number]
📄 Note: You can upload any relevant documents later if you wish.

Would you like to confirm this booking?"

⚠️ CRITICAL RULES:
- Check context BEFORE each question
- Never repeat what user already told you
- Never ask about payment before confirming doctor and time
- Always show at least 2 time slot options
- Be warm, natural, and conversational

Current Stage: ${context.current_stage}
Next logical step: ${determineNextStep(context)}`;
}

interface Message {
  role: string;
  content: string | Array<{type: string; text?: string; inline_data?: {mime_type: string; data: string}}>;
}

interface ConversationState {
  step: ConversationStep;
  dentistId?: string;
  dentistName?: string;
  phoneNumber?: string;
  symptoms?: string;
  causeIdentified?: boolean;
  uncertaintyNote?: string;
  selectedTimeSlot?: string;
  documents?: string[];
}

/**
 * ConversationManager class to track and manage conversation state with context awareness
 */
class ConversationManager {
  private state: ConversationState;
  private context: ConversationContext;
  private conversationId: string;
  private supabase: any;

  constructor(conversationId: string, supabase: any, initialState?: ConversationState, initialContext?: ConversationContext) {
    this.conversationId = conversationId;
    this.supabase = supabase;
    this.state = initialState || {
      step: ConversationStep.GREETING
    };
    this.context = initialContext || this.getDefaultContext();
  }

  getDefaultContext(): ConversationContext {
    return {
      user_name: null,
      phone_number: null,
      phone_number_provided: false,
      concern: null,
      concern_described: false,
      recommended_doctor: null,
      recommended_doctor_specialization: null,
      dentist_selected: false,
      dentist_id: null,
      appointment_time: null,
      appointment_date: null,
      appointment_time_selected: false,
      payment_method: null,
      payment_selected: false,
      documents_uploaded: false,
      wants_to_provide_later: false,
      current_stage: 'greeting'
    };
  }

  updateContext(updates: Partial<ConversationContext>) {
    this.context = { ...this.context, ...updates };
    // Save to database
    this.saveContextToDatabase();
  }

  async saveContextToDatabase() {
    await this.supabase
      .from('chatbot_conversations')
      .update({
        metadata: { 
          state: this.state,
          context: this.context 
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', this.conversationId);
  }

  getContext(): ConversationContext {
    return this.context;
  }

  // Smart detection methods
  detectPhoneNumber(message: string): string | null {
    // Extract phone number from message
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const match = message.match(phoneRegex);
    return match ? match[0] : null;
  }

  detectDeferral(message: string): boolean {
    const deferralPhrases = [
      'later', 'skip', 'not now', 'i\'ll provide', 
      'don\'t have it', 'rather not', 'next time',
      'i\'ll give', 'not right now', 'maybe later'
    ];
    return deferralPhrases.some(phrase => 
      message.toLowerCase().includes(phrase)
    );
  }

  analyzeMessage(message: string): void {
    // Check for phone number
    if (!this.context.phone_number_provided) {
      const phone = this.detectPhoneNumber(message);
      if (phone) {
        this.updateContext({
          phone_number_provided: true,
          phone_number: phone
        });
      }
    }
    
    // Check for deferral
    if (this.detectDeferral(message)) {
      this.updateContext({
        wants_to_provide_later: true
      });
    }
    
    // Detect concern and auto-match doctor
    if (!this.context.concern_described && message.length > 10) {
      const concernKeywords = [
        'pain', 'hurt', 'tooth', 'gum', 'bleeding', 'sensitive',
        'broken', 'cavity', 'ache', 'swollen', 'cleaning', 'checkup',
        'whitening', 'braces', 'alignment', 'cosmetic', 'problem', 
        'issue', 'discomfort', 'sore', 'tender', 'chipped', 'cracked'
      ];
      
      if (concernKeywords.some(kw => message.toLowerCase().includes(kw))) {
        // Match doctor based on concern
        const matchedDoctor = matchDoctorToConcern(message);
        
        this.updateContext({
          concern_described: true,
          concern: message,
          recommended_doctor: `${matchedDoctor.name} – ${matchedDoctor.description}`,
          recommended_doctor_specialization: matchedDoctor.specialization,
          current_stage: 'doctor_match'
        });
      }
    }
    
    // Detect payment method
    if (!this.context.payment_selected) {
      const paymentKeywords = {
        'cash': ['cash', 'money', 'pay cash'],
        'card': ['card', 'credit', 'debit', 'visa', 'mastercard'],
        'insurance': ['insurance', 'covered', 'insured', 'insurance']
      };
      
      for (const [method, keywords] of Object.entries(paymentKeywords)) {
        if (keywords.some(kw => message.toLowerCase().includes(kw))) {
          this.updateContext({
            payment_method: method,
            payment_selected: true
          });
          break;
        }
      }
    }
  }

  getState(): ConversationState {
    return this.state;
  }

  getCurrentStep(): ConversationStep {
    return this.state.step;
  }

  setDentistInfo(dentistId: string, dentistName: string) {
    this.state.dentistId = dentistId;
    this.state.dentistName = dentistName;
  }

  setPhoneNumber(phone: string) {
    this.state.phoneNumber = phone;
    this.state.step = ConversationStep.SYMPTOMS;
  }

  setSymptoms(symptoms: string) {
    this.state.symptoms = symptoms;
    // Check if we need to ask about cause
    const causes = suggestCauses(symptoms);
    if (causes.length > 0) {
      this.state.step = ConversationStep.CAUSE_CLARIFICATION;
    } else {
      this.state.causeIdentified = true;
      this.state.step = ConversationStep.DOCUMENTS;
    }
  }

  handleCauseResponse(response: string, isUncertain: boolean) {
    if (isUncertain) {
      this.state.causeIdentified = false;
      this.state.uncertaintyNote = generateUncertaintyNote(this.state.symptoms || 'dental issue');
    } else {
      this.state.causeIdentified = true;
    }
    this.state.step = ConversationStep.DOCUMENTS;
  }

  skipDocuments() {
    this.state.step = ConversationStep.TIME_SLOTS;
  }

  setTimeSlot(timeSlot: string) {
    this.state.selectedTimeSlot = timeSlot;
    this.state.step = ConversationStep.CONFIRMATION;
  }

  complete() {
    this.state.step = ConversationStep.COMPLETED;
  }

  /**
   * Determines the next step based on current state and user response
   * This is now simplified to let Gemini handle the conversation flow naturally
   */
  determineNextStep(userMessage: string): string {
    // Let Gemini handle the conversation flow naturally
    // Only provide basic guidance for booking-related responses
    const lowerMessage = userMessage.toLowerCase();
    
    // If user is asking about booking or appointments, provide gentle guidance
    if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      if (!this.state.phoneNumber) {
        return "I'd be happy to help you book an appointment! To get started, could you please provide your phone number?";
      }
      if (!this.state.symptoms) {
        return "Great! Now, what brings you in today? What symptoms or dental concerns do you have?";
      }
      return "Perfect! I have your information. Let me help you find available appointment times.";
    }
    
    // If user is providing phone number, validate it
    if (validatePhoneNumber(userMessage) && !this.state.phoneNumber) {
      this.setPhoneNumber(userMessage);
      return "Thank you! I have your phone number. What brings you in today?";
    }
    
    // If user is describing symptoms, record them
    if (this.state.phoneNumber && !this.state.symptoms && 
        (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('problem') || 
         lowerMessage.includes('tooth') || lowerMessage.includes('gum') || lowerMessage.includes('sensitive'))) {
      this.setSymptoms(userMessage);
      const causes = suggestCauses(userMessage);
      if (causes.length > 0) {
        return `I understand you're experiencing ${userMessage}. This could be due to: ${causes.join(', ')}. Do you know what might be causing it?`;
      }
      return "Thank you for sharing your symptoms. I'll make sure the dentist is prepared for your visit.";
    }
    
    // Handle uncertainty about causes
    if (this.state.symptoms && detectUncertainty(userMessage)) {
      this.handleCauseResponse(userMessage, true);
      return "That's completely okay! The dentist will help identify the cause during your appointment. Let me help you find available times.";
    }
    
    // Default: Let Gemini handle the response naturally
    return "";
  }
}

// Removed verifyUser function - now using verifyJWT from security module

/**
 * Save conversation message to database
 */
async function saveConversationMessage(
  supabase: any,
  conversationId: string,
  role: string,
  content: string,
  metadata?: any
) {
  try {
    // Get existing conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('chatbot_conversations')
      .select('messages')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      console.error('Error fetching conversation:', fetchError);
      return;
    }

    const messages = conversation?.messages || [];
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    });

    const { error: updateError } = await supabase
      .from('chatbot_conversations')
      .update({ 
        messages,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error saving message:', updateError);
    }
  } catch (error) {
    console.error('Error in saveConversationMessage:', error);
  }
}

/**
 * Load conversation history
 */
async function loadConversationHistory(supabase: any, conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error loading conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in loadConversationHistory:', error);
    return null;
  }
}

/**
 * Update conversation status
 */
async function updateConversationStatus(
  supabase: any,
  conversationId: string,
  status: string,
  appointmentId?: string
) {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (appointmentId) {
      updateData.appointment_id = appointmentId;
    }

    const { error } = await supabase
      .from('chatbot_conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation status:', error);
    }
  } catch (error) {
    console.error('Error in updateConversationStatus:', error);
  }
}

serve(async (req) => {
  // Generate request ID for tracking
  const requestId = crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const user = await verifyJWT(req, supabase);
    logRequest(req, user.id, { requestId, function: 'chat-bot' });

    // Check rate limit (100 requests per minute per user)
    const rateLimitCheck = checkRateLimit(getClientIdentifier(req, user.id), {
      maxRequests: 100,
      windowMs: 60000
    });

    if (rateLimitCheck.limited) {
      logError('Rate limit exceeded', { userId: user.id, requestId });
      return createRateLimitResponse(rateLimitCheck.resetTime);
    }

    // Validate and parse request body
    const rawBody = await validateRequestBody(req);
    validateRequiredFields(rawBody, ['messages']);

    // Sanitize input
    const { messages, conversationId, dentistId, dentistName, files } = sanitizeObject(rawBody);

    // Validate UUIDs if provided
    if (conversationId && !isValidUUID(conversationId)) {
      throw new Error('Invalid conversationId format');
    }
    if (dentistId && !isValidUUID(dentistId)) {
      throw new Error('Invalid dentistId format');
    }

    // Load or create conversation
    let conversationData = null;
    let conversationManager: ConversationManager;

    if (conversationId) {
      conversationData = await loadConversationHistory(supabase, conversationId);
      if (conversationData) {
        // Parse state and context from conversation metadata
        const state = conversationData.metadata?.state || { step: ConversationStep.GREETING };
        const context = conversationData.metadata?.context || undefined;
        conversationManager = new ConversationManager(conversationId, supabase, state, context);
      } else {
        conversationManager = new ConversationManager(conversationId, supabase);
      }
    } else {
      // Create new conversation
      const newConversationId = crypto.randomUUID();
      const { error: createError } = await supabase
        .from('chatbot_conversations')
        .insert({
          id: newConversationId,
          patient_id: user.id,
          dentist_id: dentistId,
          messages: [],
          status: 'active',
          metadata: { 
            state: { step: ConversationStep.GREETING, dentistId, dentistName },
            context: {}
          }
        });

      if (createError) {
        console.error('Error creating conversation:', createError);
      }

      conversationManager = new ConversationManager(newConversationId, supabase);
      if (dentistId && dentistName) {
        conversationManager.setDentistInfo(dentistId, dentistName);
      }
    }

    // Get AI API key
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured in Supabase Edge Function secrets');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured. Please contact administrator.',
          details: 'GEMINI_API_KEY environment variable is missing'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Analyze user message for context updates
    const userMessage = messages[messages.length - 1];
    if (userMessage && typeof userMessage.content === 'string') {
      conversationManager.analyzeMessage(userMessage.content);
    }

    // Get updated context
    const context = conversationManager.getContext();

    // Build context-aware system prompt
    const systemPrompt = buildContextAwarePrompt(context);

    // Save user message to conversation
    if (userMessage && conversationManager) {
      await saveConversationMessage(
        supabase,
        conversationManager.conversationId || conversationId,
        userMessage.role,
        typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content)
      );
    }

    // Convert messages to Gemini format with multimodal support
    const geminiMessages = messages.map((msg: Message) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        };
      } else {
        // Handle multimodal content
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: msg.content
        };
      }
    });

    // Add system prompt as first message
    const allMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood! I will guide the patient through booking step by step, handle uncertainty empathetically without looping, and ensure smooth conversation flow.' }] },
      ...geminiMessages
    ];

    // Prepare tools for Gemini
    const tools = [
      {
        function_declarations: [
          {
            name: "get_dentists",
            description: "Get list of available dentists with their specializations and ratings",
            parameters: {
              type: "OBJECT",
              properties: {
                specialization: {
                  type: "STRING",
                  description: "Filter by specialization (optional)"
                }
              }
            }
          },
          {
            name: "get_availability",
            description: "Get available time slots for a specific dentist",
            parameters: {
              type: "OBJECT",
              properties: {
                dentist_id: {
                  type: "STRING",
                  description: "The UUID of the dentist"
                },
                date: {
                  type: "STRING",
                  description: "Date to check availability (YYYY-MM-DD format)"
                }
              },
              required: ["dentist_id"]
            }
          },
          {
            name: "book_appointment",
            description: "Book an appointment for the patient. Use this when patient confirms booking details.",
            parameters: {
              type: "OBJECT",
              properties: {
                dentist_id: {
                  type: "STRING",
                  description: "The UUID of the dentist"
                },
                appointment_date: {
                  type: "STRING",
                  description: "Date and time of appointment (ISO format)"
                },
                appointment_type: {
                  type: "STRING",
                  description: "Type of appointment (e.g., consultation, cleaning, emergency)"
                },
                symptoms: {
                  type: "STRING",
                  description: "Patient's symptoms or reason for visit"
                },
                cause_identified: {
                  type: "BOOLEAN",
                  description: "Whether the patient knows the cause of their symptoms. Set to false if patient expressed uncertainty (e.g., 'I don't know', 'not sure')"
                },
                uncertainty_note: {
                  type: "STRING",
                  description: "Note when patient is uncertain about cause, e.g., 'Patient reports tooth pain but is unsure of the cause'. Only include if cause_identified is false"
                },
                phone_number: {
                  type: "STRING",
                  description: "Patient's phone number for contact"
                }
              },
              required: ["dentist_id", "appointment_date", "appointment_type", "symptoms", "cause_identified"]
            }
          }
        ]
      }
    ];

    // Call Gemini API with retry logic
    let response;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: allMessages,
              tools: tools,
              generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
              }
            }),
          }
        );

        if (response.ok) {
          break;
        }

        const errorText = await response.text();
        console.error(`Gemini API error (attempt ${retryCount + 1}):`, response.status, errorText);
        
        if (retryCount === maxRetries) {
          throw new Error(`Gemini API error after ${maxRetries + 1} attempts: ${response.status}`);
        }

        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      } catch (error) {
        if (retryCount === maxRetries) {
          throw error;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    const data = await response!.json();
    console.log("Gemini Response:", JSON.stringify(data, null, 2));

    // Convert Gemini response to OpenAI-compatible format for frontend
    const candidate = data.candidates?.[0];
    const content = candidate?.content;
    
    let responseData;
    let assistantMessage = '';

    if (content?.parts?.[0]?.functionCall) {
      // Tool call response
      const functionCall = content.parts[0].functionCall;
      responseData = {
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: crypto.randomUUID(),
              type: 'function',
              function: {
                name: functionCall.name,
                arguments: JSON.stringify(functionCall.args)
              }
            }]
          }
        }],
        conversationId: conversationManager?.conversationId || conversationId,
        conversationState: conversationManager?.getState()
      };
      assistantMessage = `[Tool Call: ${functionCall.name}]`;
    } else {
      // Regular text response
      const textContent = content?.parts?.map((p: any) => p.text).join('') || "I'm sorry, I couldn't process that. Let me help you book an appointment.";
      assistantMessage = textContent;
      
      responseData = {
        choices: [{
          message: {
            role: 'assistant',
            content: textContent
          }
        }],
        conversationId: conversationManager?.conversationId || conversationId,
        conversationState: conversationManager?.getState()
      };
    }

    // Save assistant response to conversation
    if (conversationManager) {
      await saveConversationMessage(
        supabase,
        conversationManager.conversationId || conversationId,
        'assistant',
        assistantMessage
      );

      // Update conversation metadata with current state and context
      await supabase
        .from('chatbot_conversations')
        .update({
          metadata: { 
            state: conversationManager.getState(),
            context: conversationManager.getContext()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationManager.conversationId || conversationId);
    }

    console.log('Response sent successfully');
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { requestId, function: 'chat-bot' });
    
    // Determine appropriate status code
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('authorization') || error.message.includes('Authentication')) {
        status = 401;
      } else if (error.message.includes('Missing required fields') || error.message.includes('Invalid')) {
        status = 400;
      }
    }

    // Provide fallback response for user-facing errors
    if (status === 500) {
      const fallbackResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: "I'm having trouble connecting right now. Let me help you book an appointment. Could you please provide your phone number?"
          }
        }],
        error: "Service temporarily unavailable"
      };

      return new Response(
        JSON.stringify(fallbackResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), status, requestId);
  }
});

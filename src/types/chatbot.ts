/**
 * Chatbot Types for DentalCareConnect
 * Defines all interfaces and enums for the AI chatbot system
 */

// Conversation states for the state machine
export enum ConversationState {
  GREETING = 'greeting',
  AWAITING_INTENT = 'awaiting_intent',
  AWAITING_NAME = 'awaiting_name',
  AWAITING_EMAIL = 'awaiting_email',
  AWAITING_PHONE = 'awaiting_phone',
  AWAITING_SYMPTOM = 'awaiting_symptom',
  SUGGESTING_DENTIST = 'suggesting_dentist',
  AWAITING_DENTIST_CONFIRMATION = 'awaiting_dentist_confirmation',
  AWAITING_DATE_TIME = 'awaiting_date_time',
  AWAITING_FINAL_CONFIRMATION = 'awaiting_final_confirmation',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// User intents detected from messages
export enum UserIntent {
  BOOK_APPOINTMENT = 'book_appointment',
  ASK_QUESTION = 'ask_question',
  CHECK_APPOINTMENT = 'check_appointment',
  CANCEL_APPOINTMENT = 'cancel_appointment',
  UNKNOWN = 'unknown',
}

// Dental specializations
export enum DentalSpecialization {
  GENERAL = 'General Dentistry',
  ORTHODONTIST = 'Orthodontist',
  PERIODONTIST = 'Periodontist',
  ENDODONTIST = 'Endodontist',
  ORAL_SURGEON = 'Oral Surgeon',
  PEDIATRIC = 'Pediatric Dentist',
  PROSTHODONTIST = 'Prosthodontist',
}

// Chat session stored in memory or database
export interface ChatSession {
  userId: string;
  currentState: ConversationState;
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

// Context data collected during conversation
export interface ConversationContext {
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  symptom?: string;
  specialization?: DentalSpecialization;
  suggestedDentist?: Dentist;
  selectedDate?: string;
  selectedTime?: string;
  appointmentId?: string;
  intent?: UserIntent;
}

// Dentist information
export interface Dentist {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  availability: TimeSlot[];
  email?: string;
  phone?: string;
  bio?: string;
}

// Time slot for availability
export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

// Chatbot response structure
export interface ChatbotResponse {
  message: string;
  state: ConversationState;
  options?: string[]; // Quick reply options
  suggestedDentist?: Dentist;
  appointmentId?: string;
  requiresInput: boolean;
}

// Symptom to specialization mapping
export const SYMPTOM_SPECIALIZATION_MAP: Record<string, DentalSpecialization> = {
  // Gum-related
  'gum pain': DentalSpecialization.PERIODONTIST,
  'bleeding gums': DentalSpecialization.PERIODONTIST,
  'swollen gums': DentalSpecialization.PERIODONTIST,
  'gum disease': DentalSpecialization.PERIODONTIST,
  
  // Tooth alignment
  'crooked teeth': DentalSpecialization.ORTHODONTIST,
  'braces': DentalSpecialization.ORTHODONTIST,
  'alignment': DentalSpecialization.ORTHODONTIST,
  'overbite': DentalSpecialization.ORTHODONTIST,
  'underbite': DentalSpecialization.ORTHODONTIST,
  
  // Root canal / tooth pain
  'tooth pain': DentalSpecialization.ENDODONTIST,
  'root canal': DentalSpecialization.ENDODONTIST,
  'severe toothache': DentalSpecialization.ENDODONTIST,
  'tooth infection': DentalSpecialization.ENDODONTIST,
  
  // Extraction / surgery
  'wisdom teeth': DentalSpecialization.ORAL_SURGEON,
  'tooth extraction': DentalSpecialization.ORAL_SURGEON,
  'jaw pain': DentalSpecialization.ORAL_SURGEON,
  'impacted tooth': DentalSpecialization.ORAL_SURGEON,
  
  // Children
  'child': DentalSpecialization.PEDIATRIC,
  'kid': DentalSpecialization.PEDIATRIC,
  'baby teeth': DentalSpecialization.PEDIATRIC,
  
  // Prosthetics
  'dentures': DentalSpecialization.PROSTHODONTIST,
  'crown': DentalSpecialization.PROSTHODONTIST,
  'bridge': DentalSpecialization.PROSTHODONTIST,
  'implant': DentalSpecialization.PROSTHODONTIST,
};

// Intent detection keywords
export const INTENT_KEYWORDS: Record<UserIntent, string[]> = {
  [UserIntent.BOOK_APPOINTMENT]: [
    'book', 'appointment', 'schedule', 'reserve', 'visit', 'see dentist', 'need dentist'
  ],
  [UserIntent.ASK_QUESTION]: [
    'question', 'ask', 'help', 'what', 'how', 'why', 'tell me'
  ],
  [UserIntent.CHECK_APPOINTMENT]: [
    'check', 'view', 'my appointment', 'when is', 'appointment status'
  ],
  [UserIntent.CANCEL_APPOINTMENT]: [
    'cancel', 'delete', 'remove appointment', 'don\'t want'
  ],
  [UserIntent.UNKNOWN]: [],
};

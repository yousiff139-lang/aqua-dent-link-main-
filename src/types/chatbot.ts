/**
 * Chatbot Types for DentalCareConnect
 * Defines all interfaces and enums for the AI chatbot system
 */

// Conversation states for the state machine
export enum ConversationState {
  GREETING = 'greeting',
  AWAITING_INTENT = 'awaiting_intent',
  AWAITING_NAME = 'awaiting_name',
  AWAITING_NAME_CONFIRMATION = 'awaiting_name_confirmation',
  AWAITING_EMAIL = 'awaiting_email',
  AWAITING_PHONE = 'awaiting_phone',
  AWAITING_GENDER = 'awaiting_gender',
  AWAITING_PREGNANCY = 'awaiting_pregnancy',
  AWAITING_CHIEF_COMPLAINT = 'awaiting_chief_complaint',
  AWAITING_SYMPTOM = 'awaiting_symptom',
  AWAITING_SYMPTOMS_OPTIONAL = 'awaiting_symptoms_optional',
  SUGGESTING_DENTIST = 'suggesting_dentist',
  AWAITING_DENTIST_CONFIRMATION = 'awaiting_dentist_confirmation',
  AWAITING_DATE_TIME = 'awaiting_date_time',
  AWAITING_PAYMENT_METHOD = 'awaiting_payment_method',
  AWAITING_MEDICAL_HISTORY = 'awaiting_medical_history',
  AWAITING_DOCUMENTS = 'awaiting_documents',
  AWAITING_CHRONIC_DISEASES = 'awaiting_chronic_diseases',
  AWAITING_SERVICE_SELECTION = 'awaiting_service_selection',
  AWAITING_DENTIST_QUERY = 'awaiting_dentist_query',
  AWAITING_QUESTION = 'awaiting_question',
  AWAITING_FINAL_CONFIRMATION = 'awaiting_final_confirmation',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// User intents detected from messages
export enum UserIntent {
  BOOK_APPOINTMENT = 'book_appointment',
  BOOK_SERVICE = 'book_service',
  ASK_QUESTION = 'ask_question',
  ASK_ABOUT_DENTIST = 'ask_about_dentist',
  CHECK_APPOINTMENT = 'check_appointment',
  VIEW_DENTISTS = 'view_dentists',
  CANCEL_APPOINTMENT = 'cancel_appointment',
  BACK_TO_MENU = 'back_to_menu',
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
  gender?: 'male' | 'female';
  isPregnant?: boolean;
  chiefComplaint?: string;
  symptom?: string;
  symptoms?: string; // Optional additional symptoms
  medicalHistory?: string;
  chronicDiseases?: string;
  hasDocuments?: boolean;
  wantsDocuments?: boolean;
  specialization?: DentalSpecialization;
  suggestedDentist?: Dentist;
  selectedService?: DentalService;
  selectedDate?: string;
  selectedTime?: string;
  paymentMethod?: 'cash' | 'card';
  appointmentId?: string;
  intent?: UserIntent;
  isGuest?: boolean; // Mark guest sessions
  documentUrls?: string[];
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
  showFileUpload?: boolean; // Show file upload UI
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

  // Root canal / severe tooth pain (simple pain goes to General)
  'root canal': DentalSpecialization.ENDODONTIST,
  'severe toothache': DentalSpecialization.ENDODONTIST,
  'tooth infection': DentalSpecialization.ENDODONTIST,
  'toothache': DentalSpecialization.ENDODONTIST,
  // Simple tooth pain should go to General Dentist - map only severe cases to Endodontist

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
  [UserIntent.BOOK_SERVICE]: [
    'book service', 'service', 'cleanup', 'whitening', 'checkup', 'cleaning'
  ],
  [UserIntent.ASK_QUESTION]: [
    'question', 'ask', 'help', 'what', 'how', 'why', 'tell me about dentistry', 'dental'
  ],
  [UserIntent.ASK_ABOUT_DENTIST]: [
    'tell me about dr', 'info about', 'who is dr', 'about the dentist', 'dentist info'
  ],
  [UserIntent.CHECK_APPOINTMENT]: [
    'check', 'view', 'my appointment', 'when is', 'appointment status'
  ],
  [UserIntent.VIEW_DENTISTS]: [
    'view dentists', 'show dentists', 'available dentists', 'list dentists', 'dentist list'
  ],
  [UserIntent.CANCEL_APPOINTMENT]: [
    'cancel', 'delete', 'remove appointment', 'don\'t want'
  ],
  [UserIntent.BACK_TO_MENU]: [
    'back to menu', 'main menu', 'start over', 'restart', 'home'
  ],
  [UserIntent.UNKNOWN]: [],
};

// Dental Service interface
export interface DentalService {
  id: string;
  name: string;
  description: string;
  specialty: string;
  duration_minutes: number;
  price_min: number;
  price_max: number | null;
}

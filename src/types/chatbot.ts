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
  // Card payment collection states
  AWAITING_CARD_NUMBER = 'awaiting_card_number',
  AWAITING_CARD_EXPIRY = 'awaiting_card_expiry',
  AWAITING_CARD_CVV = 'awaiting_card_cvv',
  PROCESSING_PAYMENT = 'processing_payment',
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

// Dental specializations - MUST match exactly what's in AddDoctor dropdown
export enum DentalSpecialization {
  GENERAL = 'General Dentistry',
  ORTHODONTICS = 'Orthodontics',
  PERIODONTICS = 'Periodontics',
  ENDODONTICS = 'Endodontics',
  PROSTHODONTICS = 'Prosthodontics',
  ORAL_SURGERY = 'Oral Surgery',
  PEDIATRIC = 'Pediatric Dentistry',
  COSMETIC = 'Cosmetic Dentistry',
  IMPLANT = 'Implant Dentistry',
  RESTORATIVE = 'Restorative Dentistry',
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
  // Card payment info (for card payment method)
  cardInfo?: {
    cardNumber?: string;
    cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';
    lastFour?: string;
    expiryDate?: string;
    cvv?: string;
    isValid?: boolean;
  };
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

// Symptom to specialization mapping - Comprehensive keyword matching for accurate dentist suggestions
// This maps patient symptoms/concerns to the appropriate dental specialty
// Keywords are matched via .includes() so partial matches work
export const SYMPTOM_SPECIALIZATION_MAP: Record<string, DentalSpecialization> = {
  // ==================== PERIODONTICS (Gum Specialist) ====================
  'gum pain': DentalSpecialization.PERIODONTICS,
  'bleeding gums': DentalSpecialization.PERIODONTICS,
  'swollen gums': DentalSpecialization.PERIODONTICS,
  'gum disease': DentalSpecialization.PERIODONTICS,
  'gum infection': DentalSpecialization.PERIODONTICS,
  'gum recession': DentalSpecialization.PERIODONTICS,
  'receding gums': DentalSpecialization.PERIODONTICS,
  'gingivitis': DentalSpecialization.PERIODONTICS,
  'periodontitis': DentalSpecialization.PERIODONTICS,
  'periodontal': DentalSpecialization.PERIODONTICS,
  'loose tooth': DentalSpecialization.PERIODONTICS,
  'loose teeth': DentalSpecialization.PERIODONTICS,
  'bad breath': DentalSpecialization.PERIODONTICS,
  'halitosis': DentalSpecialization.PERIODONTICS,
  'gum bleeding': DentalSpecialization.PERIODONTICS,
  'gums hurt': DentalSpecialization.PERIODONTICS,
  'gum problem': DentalSpecialization.PERIODONTICS,
  'plaque buildup': DentalSpecialization.PERIODONTICS,
  'tartar': DentalSpecialization.PERIODONTICS,
  'deep cleaning': DentalSpecialization.PERIODONTICS,
  'scaling': DentalSpecialization.PERIODONTICS,
  'root planing': DentalSpecialization.PERIODONTICS,
  'pocket': DentalSpecialization.PERIODONTICS,
  'bone loss': DentalSpecialization.PERIODONTICS,
  'gum surgery': DentalSpecialization.PERIODONTICS,
  'gum graft': DentalSpecialization.PERIODONTICS,

  // ==================== ORTHODONTICS (Alignment/Braces Specialist) ====================
  'crooked teeth': DentalSpecialization.ORTHODONTICS,
  'crooked tooth': DentalSpecialization.ORTHODONTICS,
  'braces': DentalSpecialization.ORTHODONTICS,
  'ortho': DentalSpecialization.ORTHODONTICS,
  'orthodontic': DentalSpecialization.ORTHODONTICS,
  'alignment': DentalSpecialization.ORTHODONTICS,
  'misaligned': DentalSpecialization.ORTHODONTICS,
  'misalignment': DentalSpecialization.ORTHODONTICS,
  'overbite': DentalSpecialization.ORTHODONTICS,
  'underbite': DentalSpecialization.ORTHODONTICS,
  'crossbite': DentalSpecialization.ORTHODONTICS,
  'open bite': DentalSpecialization.ORTHODONTICS,
  'deep bite': DentalSpecialization.ORTHODONTICS,
  // Gap/Spacing keywords - CRITICAL for matching "space between teeth"
  'gap': DentalSpecialization.ORTHODONTICS,
  'gaps': DentalSpecialization.ORTHODONTICS,
  'space between': DentalSpecialization.ORTHODONTICS,
  'spacing': DentalSpecialization.ORTHODONTICS,
  'spaces': DentalSpecialization.ORTHODONTICS,
  'diastema': DentalSpecialization.ORTHODONTICS,
  'teeth apart': DentalSpecialization.ORTHODONTICS,
  'teeth spread': DentalSpecialization.ORTHODONTICS,
  'gap between front': DentalSpecialization.ORTHODONTICS,
  // Straightening keywords
  'straighten': DentalSpecialization.ORTHODONTICS,
  'straight teeth': DentalSpecialization.ORTHODONTICS,
  'fix teeth position': DentalSpecialization.ORTHODONTICS,
  'correct teeth': DentalSpecialization.ORTHODONTICS,
  // Modern orthodontic treatments
  'invisalign': DentalSpecialization.ORTHODONTICS,
  'clear aligner': DentalSpecialization.ORTHODONTICS,
  'aligner': DentalSpecialization.ORTHODONTICS,
  'retainer': DentalSpecialization.ORTHODONTICS,
  'orthodontic wire': DentalSpecialization.ORTHODONTICS,
  'bracket': DentalSpecialization.ORTHODONTICS,
  'rubber band': DentalSpecialization.ORTHODONTICS,
  'expander': DentalSpecialization.ORTHODONTICS,
  'palate expander': DentalSpecialization.ORTHODONTICS,
  // Crowding
  'crowded teeth': DentalSpecialization.ORTHODONTICS,
  'crowding': DentalSpecialization.ORTHODONTICS,
  'overlapping': DentalSpecialization.ORTHODONTICS,
  'overlap': DentalSpecialization.ORTHODONTICS,
  'twisted': DentalSpecialization.ORTHODONTICS,
  'rotated tooth': DentalSpecialization.ORTHODONTICS,
  'protruding': DentalSpecialization.ORTHODONTICS,
  'buck teeth': DentalSpecialization.ORTHODONTICS,
  'front teeth stick out': DentalSpecialization.ORTHODONTICS,
  'jaw alignment': DentalSpecialization.ORTHODONTICS,
  'teeth not straight': DentalSpecialization.ORTHODONTICS,

  // ==================== ENDODONTICS (Root Canal Specialist) ====================
  'root canal': DentalSpecialization.ENDODONTICS,
  'endodontic': DentalSpecialization.ENDODONTICS,
  'severe toothache': DentalSpecialization.ENDODONTICS,
  'tooth infection': DentalSpecialization.ENDODONTICS,
  'infected tooth': DentalSpecialization.ENDODONTICS,
  'toothache': DentalSpecialization.ENDODONTICS,
  'tooth pain': DentalSpecialization.ENDODONTICS,
  'throbbing pain': DentalSpecialization.ENDODONTICS,
  'abscess': DentalSpecialization.ENDODONTICS,
  'dental abscess': DentalSpecialization.ENDODONTICS,
  'pulp': DentalSpecialization.ENDODONTICS,
  'pulpitis': DentalSpecialization.ENDODONTICS,
  'nerve pain': DentalSpecialization.ENDODONTICS,
  'nerve damage': DentalSpecialization.ENDODONTICS,
  'hot cold sensitivity': DentalSpecialization.ENDODONTICS,
  'tooth sensitive': DentalSpecialization.ENDODONTICS,
  'severe sensitivity': DentalSpecialization.ENDODONTICS,
  'cavity pain': DentalSpecialization.ENDODONTICS,
  'deep cavity': DentalSpecialization.ENDODONTICS,
  'tooth swelling': DentalSpecialization.ENDODONTICS,
  'pus': DentalSpecialization.ENDODONTICS,
  'cracked tooth': DentalSpecialization.ENDODONTICS,
  'fractured tooth': DentalSpecialization.ENDODONTICS,
  'dental trauma': DentalSpecialization.ENDODONTICS,
  'retreatment': DentalSpecialization.ENDODONTICS,
  'apicoectomy': DentalSpecialization.ENDODONTICS,
  'dead tooth': DentalSpecialization.ENDODONTICS,
  'dying tooth': DentalSpecialization.ENDODONTICS,
  'tooth dark': DentalSpecialization.ENDODONTICS,

  // ==================== ORAL SURGERY ====================
  'wisdom teeth': DentalSpecialization.ORAL_SURGERY,
  'wisdom tooth': DentalSpecialization.ORAL_SURGERY,
  'third molar': DentalSpecialization.ORAL_SURGERY,
  'tooth extraction': DentalSpecialization.ORAL_SURGERY,
  'extract': DentalSpecialization.ORAL_SURGERY,
  'extraction': DentalSpecialization.ORAL_SURGERY,
  'remove tooth': DentalSpecialization.ORAL_SURGERY,
  'pull tooth': DentalSpecialization.ORAL_SURGERY,
  'jaw pain': DentalSpecialization.ORAL_SURGERY,
  'jaw problem': DentalSpecialization.ORAL_SURGERY,
  'tmj': DentalSpecialization.ORAL_SURGERY,
  'temporomandibular': DentalSpecialization.ORAL_SURGERY,
  'jaw click': DentalSpecialization.ORAL_SURGERY,
  'jaw lock': DentalSpecialization.ORAL_SURGERY,
  'jaw pop': DentalSpecialization.ORAL_SURGERY,
  'impacted tooth': DentalSpecialization.ORAL_SURGERY,
  'impacted': DentalSpecialization.ORAL_SURGERY,
  'oral surgery': DentalSpecialization.ORAL_SURGERY,
  'surgical': DentalSpecialization.ORAL_SURGERY,
  'bone graft': DentalSpecialization.ORAL_SURGERY,
  'biopsy': DentalSpecialization.ORAL_SURGERY,
  'cyst': DentalSpecialization.ORAL_SURGERY,
  'oral cancer': DentalSpecialization.ORAL_SURGERY,
  'mouth cancer': DentalSpecialization.ORAL_SURGERY,
  'lesion': DentalSpecialization.ORAL_SURGERY,
  'facial injury': DentalSpecialization.ORAL_SURGERY,
  'facial trauma': DentalSpecialization.ORAL_SURGERY,
  'broken jaw': DentalSpecialization.ORAL_SURGERY,
  'jaw fracture': DentalSpecialization.ORAL_SURGERY,
  'cleft': DentalSpecialization.ORAL_SURGERY,
  'sleep apnea': DentalSpecialization.ORAL_SURGERY,

  // ==================== PEDIATRIC DENTISTRY (Children) ====================
  'child': DentalSpecialization.PEDIATRIC,
  'children': DentalSpecialization.PEDIATRIC,
  'kid': DentalSpecialization.PEDIATRIC,
  'kids': DentalSpecialization.PEDIATRIC,
  'baby teeth': DentalSpecialization.PEDIATRIC,
  'baby tooth': DentalSpecialization.PEDIATRIC,
  'toddler': DentalSpecialization.PEDIATRIC,
  'infant': DentalSpecialization.PEDIATRIC,
  'son': DentalSpecialization.PEDIATRIC,
  'daughter': DentalSpecialization.PEDIATRIC,
  'my child': DentalSpecialization.PEDIATRIC,
  'year old': DentalSpecialization.PEDIATRIC,
  '3 year': DentalSpecialization.PEDIATRIC,
  '4 year': DentalSpecialization.PEDIATRIC,
  '5 year': DentalSpecialization.PEDIATRIC,
  '6 year': DentalSpecialization.PEDIATRIC,
  '7 year': DentalSpecialization.PEDIATRIC,
  '8 year': DentalSpecialization.PEDIATRIC,
  '9 year': DentalSpecialization.PEDIATRIC,
  '10 year': DentalSpecialization.PEDIATRIC,
  'teething': DentalSpecialization.PEDIATRIC,
  'first tooth': DentalSpecialization.PEDIATRIC,
  'milk teeth': DentalSpecialization.PEDIATRIC,
  'primary teeth': DentalSpecialization.PEDIATRIC,
  'deciduous': DentalSpecialization.PEDIATRIC,
  'pediatric': DentalSpecialization.PEDIATRIC,
  'adolescent': DentalSpecialization.PEDIATRIC,
  'teenager': DentalSpecialization.PEDIATRIC,
  'sealant for child': DentalSpecialization.PEDIATRIC,
  'space maintainer': DentalSpecialization.PEDIATRIC,
  'thumb sucking': DentalSpecialization.PEDIATRIC,
  'pacifier': DentalSpecialization.PEDIATRIC,

  // ==================== PROSTHODONTICS (Prosthetics/Replacement) ====================
  'dentures': DentalSpecialization.PROSTHODONTICS,
  'denture': DentalSpecialization.PROSTHODONTICS,
  'full denture': DentalSpecialization.PROSTHODONTICS,
  'partial denture': DentalSpecialization.PROSTHODONTICS,
  'prosthodontic': DentalSpecialization.PROSTHODONTICS,
  'missing tooth': DentalSpecialization.PROSTHODONTICS,
  'missing teeth': DentalSpecialization.PROSTHODONTICS,
  'lost tooth': DentalSpecialization.PROSTHODONTICS,
  'teeth fell out': DentalSpecialization.PROSTHODONTICS,
  'replace tooth': DentalSpecialization.PROSTHODONTICS,
  'tooth replacement': DentalSpecialization.PROSTHODONTICS,
  'false teeth': DentalSpecialization.PROSTHODONTICS,
  'full mouth restoration': DentalSpecialization.PROSTHODONTICS,
  'all teeth': DentalSpecialization.PROSTHODONTICS,
  'complete restoration': DentalSpecialization.PROSTHODONTICS,

  // ==================== COSMETIC DENTISTRY ====================
  'whitening': DentalSpecialization.COSMETIC,
  'teeth whitening': DentalSpecialization.COSMETIC,
  'bleaching': DentalSpecialization.COSMETIC,
  'white teeth': DentalSpecialization.COSMETIC,
  'yellow teeth': DentalSpecialization.COSMETIC,
  'stain': DentalSpecialization.COSMETIC,
  'stained teeth': DentalSpecialization.COSMETIC,
  'stains': DentalSpecialization.COSMETIC,
  'discolored': DentalSpecialization.COSMETIC,
  'discoloration': DentalSpecialization.COSMETIC,
  'cosmetic': DentalSpecialization.COSMETIC,
  'smile makeover': DentalSpecialization.COSMETIC,
  'veneer': DentalSpecialization.COSMETIC,
  'veneers': DentalSpecialization.COSMETIC,
  'porcelain veneer': DentalSpecialization.COSMETIC,
  'beautiful smile': DentalSpecialization.COSMETIC,
  'smile design': DentalSpecialization.COSMETIC,
  'hollywood smile': DentalSpecialization.COSMETIC,
  'bonding': DentalSpecialization.COSMETIC,
  'tooth bonding': DentalSpecialization.COSMETIC,
  'contouring': DentalSpecialization.COSMETIC,
  'reshaping': DentalSpecialization.COSMETIC,
  'tooth shape': DentalSpecialization.COSMETIC,
  'gummy smile': DentalSpecialization.COSMETIC,
  'gum contouring': DentalSpecialization.COSMETIC,
  'aesthetic': DentalSpecialization.COSMETIC,
  'esthetic': DentalSpecialization.COSMETIC,
  'appearance': DentalSpecialization.COSMETIC,
  'look better': DentalSpecialization.COSMETIC,
  'zoom': DentalSpecialization.COSMETIC,

  // ==================== IMPLANT DENTISTRY ====================
  'implant': DentalSpecialization.IMPLANT,
  'implants': DentalSpecialization.IMPLANT,
  'dental implant': DentalSpecialization.IMPLANT,
  'tooth implant': DentalSpecialization.IMPLANT,
  'titanium': DentalSpecialization.IMPLANT,
  'all on 4': DentalSpecialization.IMPLANT,
  'all on four': DentalSpecialization.IMPLANT,
  'all-on-4': DentalSpecialization.IMPLANT,
  'implant crown': DentalSpecialization.IMPLANT,
  'abutment': DentalSpecialization.IMPLANT,
  'osseointegration': DentalSpecialization.IMPLANT,
  'implant supported': DentalSpecialization.IMPLANT,
  'implant bridge': DentalSpecialization.IMPLANT,
  'mini implant': DentalSpecialization.IMPLANT,
  'zygomatic': DentalSpecialization.IMPLANT,
  'immediate implant': DentalSpecialization.IMPLANT,
  'same day implant': DentalSpecialization.IMPLANT,
  'teeth in a day': DentalSpecialization.IMPLANT,

  // ==================== RESTORATIVE DENTISTRY ====================
  'crown': DentalSpecialization.RESTORATIVE,
  'crowns': DentalSpecialization.RESTORATIVE,
  'dental crown': DentalSpecialization.RESTORATIVE,
  'tooth crown': DentalSpecialization.RESTORATIVE,
  'cap': DentalSpecialization.RESTORATIVE,
  'bridge': DentalSpecialization.RESTORATIVE,
  'bridges': DentalSpecialization.RESTORATIVE,
  'dental bridge': DentalSpecialization.RESTORATIVE,
  'filling': DentalSpecialization.RESTORATIVE,
  'fillings': DentalSpecialization.RESTORATIVE,
  'cavity': DentalSpecialization.RESTORATIVE,
  'cavities': DentalSpecialization.RESTORATIVE,
  'decay': DentalSpecialization.RESTORATIVE,
  'tooth decay': DentalSpecialization.RESTORATIVE,
  'restoration': DentalSpecialization.RESTORATIVE,
  'restorative': DentalSpecialization.RESTORATIVE,
  'inlay': DentalSpecialization.RESTORATIVE,
  'onlay': DentalSpecialization.RESTORATIVE,
  'composite': DentalSpecialization.RESTORATIVE,
  'amalgam': DentalSpecialization.RESTORATIVE,
  'broken tooth': DentalSpecialization.RESTORATIVE,
  'chipped tooth': DentalSpecialization.RESTORATIVE,
  'cracked': DentalSpecialization.RESTORATIVE,
  'damaged tooth': DentalSpecialization.RESTORATIVE,
  'fix tooth': DentalSpecialization.RESTORATIVE,
  'repair tooth': DentalSpecialization.RESTORATIVE,
  'porcelain': DentalSpecialization.RESTORATIVE,
  'ceramic': DentalSpecialization.RESTORATIVE,

  // ==================== GENERAL DENTISTRY (Routine Care) ====================
  // Note: General is the fallback, but we still map common general terms
  'checkup': DentalSpecialization.GENERAL,
  'check up': DentalSpecialization.GENERAL,
  'check-up': DentalSpecialization.GENERAL,
  'cleaning': DentalSpecialization.GENERAL,
  'teeth cleaning': DentalSpecialization.GENERAL,
  'dental cleaning': DentalSpecialization.GENERAL,
  'routine': DentalSpecialization.GENERAL,
  'regular': DentalSpecialization.GENERAL,
  'exam': DentalSpecialization.GENERAL,
  'examination': DentalSpecialization.GENERAL,
  'dental exam': DentalSpecialization.GENERAL,
  'x-ray': DentalSpecialization.GENERAL,
  'xray': DentalSpecialization.GENERAL,
  'x ray': DentalSpecialization.GENERAL,
  'fluoride': DentalSpecialization.GENERAL,
  'sealant': DentalSpecialization.GENERAL,
  'preventive': DentalSpecialization.GENERAL,
  'prevention': DentalSpecialization.GENERAL,
  'mild sensitivity': DentalSpecialization.GENERAL,
  'general dentist': DentalSpecialization.GENERAL,
  'family dentist': DentalSpecialization.GENERAL,
  'regular dentist': DentalSpecialization.GENERAL,
  'first visit': DentalSpecialization.GENERAL,
  'new patient': DentalSpecialization.GENERAL,
  'consultation': DentalSpecialization.GENERAL,
  'second opinion': DentalSpecialization.GENERAL,
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

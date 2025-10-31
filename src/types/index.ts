/**
 * Central export file for all TypeScript type definitions
 * Import types from this file for consistency across the application
 */

// Dentist types
export type {
  Dentist,
  DentistProfile,
  DentistStats,
  BookingFilter,
  BookingSort,
} from './dentist';

// Appointment types
export type {
  Appointment,
  AppointmentCreateData,
  AppointmentUpdateData,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
} from './appointment';

// Booking types (from dentist.ts)
export type {
  Booking,
  BookingDocument,
  PaymentEmail,
} from './dentist';

// Admin types
export type {
  Dentist as AdminDentist,
  PatientAppointment,
  DentistWithAppointments,
} from './admin';

// Chatbot types
export {
  ConversationStatus,
  AppointmentStatus as ChatbotAppointmentStatus,
  MessageType,
  MessageRole,
  ConversationStep,
  UNCERTAINTY_INDICATORS,
  detectUncertainty,
  generateUncertaintyNote,
} from './chatbot';

export type {
  ChatMessage,
  DocumentReference,
  BookingData,
  TimeSlot,
  AppointmentSummary,
  ConversationSession,
  BotResponse,
  Reservation,
  CancellationResult,
  DocumentUpload,
  SummaryDocument,
} from './chatbot';

/**
 * Validation utilities for booking system
 * Provides client-side validation for forms, files, and booking data
 */

// Define BookingData interface for validation
export interface BookingData {
  patientId?: string;
  dentistId?: string;
  patientPhone?: string;
  symptoms?: string;
  appointmentTime?: Date;
  conversationId?: string;
  medicalHistory?: string;
  causeIdentified?: boolean;
  uncertaintyNote?: string;
}

export interface DocumentReference {
  id: string;
  name: string;
  url: string;
  type: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Phone number validation
 * Validates phone numbers in various formats
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!phone || phone.trim().length === 0) {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    errors.push('Phone number must be at least 10 digits');
  }
  
  if (digitsOnly.length > 15) {
    errors.push('Phone number cannot exceed 15 digits');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Symptoms validation
 * Validates symptom description
 */
export const validateSymptoms = (symptoms: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!symptoms || symptoms.trim().length === 0) {
    errors.push('Please describe your symptoms or reason for visit');
    return { isValid: false, errors };
  }

  if (symptoms.trim().length < 10) {
    errors.push('Please provide more details about your symptoms (at least 10 characters)');
  }

  if (symptoms.length > 1000) {
    errors.push('Symptom description is too long (maximum 1000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * File upload validation
 * Validates file type and size
 */
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  currentFileCount?: number;
}

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): ValidationResult => {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    maxFiles = 5,
    currentFileCount = 0
  } = options;

  const errors: string[] = [];

  // Check file count
  if (currentFileCount >= maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
    return { isValid: false, errors };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ');
    errors.push(`Invalid file type. Allowed types: ${allowedExtensions}`);
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate multiple files
 */
export const validateFiles = (
  files: File[],
  options: FileValidationOptions = {}
): ValidationResult => {
  const errors: string[] = [];
  
  if (files.length === 0) {
    return { isValid: true, errors };
  }

  files.forEach((file, index) => {
    const result = validateFile(file, {
      ...options,
      currentFileCount: (options.currentFileCount || 0) + index
    });
    
    if (!result.isValid) {
      errors.push(`${file.name}: ${result.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Time slot availability validation
 * Checks if a time slot is in the future and available
 */
export const validateTimeSlot = (slotTime: Date): ValidationResult => {
  const errors: string[] = [];
  const now = new Date();

  if (!slotTime) {
    errors.push('Please select a time slot');
    return { isValid: false, errors };
  }

  // Check if slot is in the past
  if (slotTime <= now) {
    errors.push('Selected time slot is in the past');
  }

  // Check if slot is too far in the future (e.g., more than 6 months)
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  
  if (slotTime > sixMonthsFromNow) {
    errors.push('Cannot book appointments more than 6 months in advance');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Cancellation timing validation
 * Validates if appointment can be cancelled (1-hour policy)
 */
export const validateCancellationTiming = (appointmentTime: Date): ValidationResult => {
  const errors: string[] = [];
  const now = new Date();
  
  if (!appointmentTime) {
    errors.push('Invalid appointment time');
    return { isValid: false, errors };
  }

  // Check if appointment is in the past
  if (appointmentTime <= now) {
    errors.push('Cannot cancel past appointments');
    return { isValid: false, errors };
  }

  // Calculate hours until appointment
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check 1-hour policy
  if (hoursUntilAppointment <= 1) {
    errors.push('Appointments cannot be cancelled within 1 hour of the scheduled time');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Booking data validation
 * Validates complete booking data before submission
 */
export const validateBookingData = (bookingData: Partial<BookingData>): ValidationResult => {
  const errors: string[] = [];

  // Validate patient ID
  if (!bookingData.patientId) {
    errors.push('Patient ID is required');
  }

  // Validate dentist ID
  if (!bookingData.dentistId) {
    errors.push('Dentist ID is required');
  }

  // Validate phone number
  if (bookingData.patientPhone) {
    const phoneValidation = validatePhoneNumber(bookingData.patientPhone);
    if (!phoneValidation.isValid) {
      errors.push(...phoneValidation.errors);
    }
  } else {
    errors.push('Phone number is required');
  }

  // Validate symptoms
  if (bookingData.symptoms) {
    const symptomsValidation = validateSymptoms(bookingData.symptoms);
    if (!symptomsValidation.isValid) {
      errors.push(...symptomsValidation.errors);
    }
  } else {
    errors.push('Symptoms or reason for visit is required');
  }

  // Validate appointment time
  if (bookingData.appointmentTime) {
    const timeValidation = validateTimeSlot(bookingData.appointmentTime);
    if (!timeValidation.isValid) {
      errors.push(...timeValidation.errors);
    }
  } else {
    errors.push('Appointment time is required');
  }

  // Validate conversation ID
  if (!bookingData.conversationId) {
    errors.push('Conversation ID is required');
  }

  // Validate medical history length if provided
  if (bookingData.medicalHistory && bookingData.medicalHistory.length > 2000) {
    errors.push('Medical history is too long (maximum 2000 characters)');
  }

  // Validate uncertainty note if cause not identified
  if (bookingData.causeIdentified === false && !bookingData.uncertaintyNote) {
    errors.push('Uncertainty note is required when cause is not identified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Date validation
 * Validates if a date is valid and within acceptable range
 */
export const validateDate = (date: Date | string): ValidationResult => {
  const errors: string[] = [];
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    errors.push('Invalid date');
    return { isValid: false, errors };
  }

  // Check if date is too far in the past (more than 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (dateObj < oneYearAgo) {
    errors.push('Date cannot be more than 1 year in the past');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Text length validation
 */
export const validateTextLength = (
  text: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'Field'
): ValidationResult => {
  const errors: string[] = [];
  
  if (!text || text.trim().length === 0) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  const trimmedLength = text.trim().length;

  if (trimmedLength < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmedLength > maxLength) {
    errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

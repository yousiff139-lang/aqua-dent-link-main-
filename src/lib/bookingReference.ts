import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique alphanumeric booking reference code
 * Format: 8 characters (A-Z, 0-9)
 * Example: A3B7K9M2
 * 
 * @returns Promise<string> - Unique booking reference
 */
export async function generateBookingReference(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate 8-character reference
    reference = '';
    for (let i = 0; i < 8; i++) {
      reference += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check uniqueness in database
    const unique = await checkReferenceUniqueness(reference);
    isUnique = unique;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique booking reference after multiple attempts');
  }

  return reference;
}

/**
 * Check if a booking reference is unique in the database
 * 
 * @param reference - The booking reference to check
 * @returns Promise<boolean> - True if unique, false if already exists
 */
export async function checkReferenceUniqueness(reference: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('booking_reference', reference)
      .maybeSingle();

    if (error) {
      console.error('Error checking reference uniqueness:', error);
      throw error;
    }

    // If no data found, reference is unique
    return !data;
  } catch (error) {
    console.error('Error in checkReferenceUniqueness:', error);
    throw new Error('Failed to validate booking reference uniqueness');
  }
}

/**
 * Format a booking reference for display
 * Adds hyphens for better readability: A3B7-K9M2
 * 
 * @param reference - The booking reference to format
 * @returns Formatted booking reference
 */
export function formatBookingReference(reference: string): string {
  if (reference.length !== 8) {
    return reference;
  }
  return `${reference.slice(0, 4)}-${reference.slice(4)}`;
}

/**
 * Validate booking reference format
 * Must be 8 alphanumeric characters (A-Z, 0-9)
 * 
 * @param reference - The booking reference to validate
 * @returns True if valid format, false otherwise
 */
export function validateBookingReferenceFormat(reference: string): boolean {
  const pattern = /^[A-Z0-9]{8}$/;
  return pattern.test(reference);
}

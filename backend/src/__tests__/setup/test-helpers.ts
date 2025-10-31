/**
 * Test helpers for integration tests
 */

import { supabase } from '../../config/supabase.js';

/**
 * Generate a mock JWT token for testing
 */
export const generateMockToken = (userId: string, email: string, role?: string): string => {
  // For integration tests, we'll use a simple mock token
  // In real tests, you'd generate a proper JWT
  return `mock-token-${userId}`;
};

/**
 * Create a test user in the database
 */
export const createTestUser = async (email: string, role: string = 'patient') => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      email,
      full_name: `Test ${role}`,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a test dentist
 */
export const createTestDentist = async (email: string) => {
  // First create profile
  const profile = await createTestUser(email, 'dentist');

  // Then create dentist record
  const { data, error } = await supabase
    .from('dentists')
    .insert({
      id: profile.id,
      specialization: 'General Dentistry',
      bio: 'Test dentist',
      years_of_experience: 5,
    })
    .select()
    .single();

  if (error) throw error;
  return { profile, dentist: data };
};

/**
 * Clean up test data
 */
export const cleanupTestData = async (tableName: string, condition: any) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .match(condition);

  if (error) {
    console.warn(`Failed to cleanup ${tableName}:`, error.message);
  }
};

/**
 * Create a test appointment
 */
export const createTestAppointment = async (data: any) => {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return appointment;
};

/**
 * Wait for a condition to be true (useful for async operations)
 */
export const waitFor = async (
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
};

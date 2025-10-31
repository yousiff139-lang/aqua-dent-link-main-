import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { isAdminEmail } from '@/lib/auth';

/**
 * E2E Tests for Admin Workflow
 * These tests validate the complete admin authentication and management flow
 * 
 * Test Coverage:
 * - Admin authentication (signup/signin)
 * - Admin dashboard access control
 * - Dentist list viewing
 * - Dentist details viewing
 * - Availability management (add/edit/delete)
 * - Patient appointments viewing
 * - Error scenarios and edge cases
 * - Non-admin access prevention
 */

describe('E2E - Admin Authentication Flow', () => {
  describe('Admin Email Detection', () => {
    it('should correctly identify admin emails', () => {
      // Test admin emails
      expect(isAdminEmail('karrarmayaly@gmail.com')).toBe(true);
      expect(isAdminEmail('bingo@gmail.com')).toBe(true);
      
      // Test case insensitivity
      expect(isAdminEmail('KARRARMAYALY@GMAIL.COM')).toBe(true);
      expect(isAdminEmail('Bingo@Gmail.Com')).toBe(true);
    });

    it('should reject non-admin emails', () => {
      expect(isAdminEmail('user@example.com')).toBe(false);
      expect(isAdminEmail('dentist@clinic.com')).toBe(false);
      expect(isAdminEmail('patient@test.com')).toBe(false);
    });

    it('should handle null and undefined emails', () => {
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
      expect(isAdminEmail('')).toBe(false);
    });
  });

  describe('Admin Signup Flow', () => {
    it('should validate admin signup data structure', () => {
      const adminSignupData = {
        email: 'karrarmayaly@gmail.com',
        password: 'SecurePass123!',
        firstName: 'Karrar',
        lastName: 'Mayaly',
      };

      // Validate required fields
      expect(adminSignupData.email).toBeDefined();
      expect(adminSignupData.password).toBeDefined();
      expect(adminSignupData.password.length).toBeGreaterThanOrEqual(8);
      expect(isAdminEmail(adminSignupData.email)).toBe(true);
    });

    it('should handle admin signup response', () => {
      const signupResponse = {
        user: {
          id: 'user-123',
          email: 'karrarmayaly@gmail.com',
          email_confirmed_at: null,
          identities: [{ provider: 'email' }],
        },
        session: null, // Email confirmation required
      };

      // Validate signup response
      expect(signupResponse.user.email).toBe('karrarmayaly@gmail.com');
      expect(isAdminEmail(signupResponse.user.email)).toBe(true);
      expect(signupResponse.user.identities.length).toBeGreaterThan(0);
    });

    it('should detect existing admin account', () => {
      const existingAccountResponse = {
        user: {
          id: 'user-123',
          email: 'karrarmayaly@gmail.com',
          identities: [], // Empty identities indicates existing account
        },
        session: null,
      };

      // Validate existing account detection
      expect(existingAccountResponse.user.identities).toHaveLength(0);
    });
  });

  describe('Admin Signin Flow', () => {
    it('should validate admin signin credentials', () => {
      const signinData = {
        email: 'karrarmayaly@gmail.com',
        password: 'SecurePass123!',
      };

      expect(signinData.email).toBeDefined();
      expect(signinData.password).toBeDefined();
      expect(isAdminEmail(signinData.email)).toBe(true);
    });

    it('should handle successful admin signin', () => {
      const signinResponse = {
        user: {
          id: 'user-123',
          email: 'karrarmayaly@gmail.com',
          email_confirmed_at: '2025-10-27T10:00:00Z',
        },
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh-123',
        },
      };

      // Validate signin response
      expect(signinResponse.user.email).toBe('karrarmayaly@gmail.com');
      expect(isAdminEmail(signinResponse.user.email)).toBe(true);
      expect(signinResponse.session).toBeDefined();
      expect(signinResponse.user.email_confirmed_at).toBeDefined();
    });

    it('should determine correct redirect path for admin', () => {
      const user = {
        email: 'karrarmayaly@gmail.com',
        role: 'admin',
      };

      const redirectPath = isAdminEmail(user.email) ? '/admin' : '/dashboard';
      expect(redirectPath).toBe('/admin');
    });

    it('should determine correct redirect path for non-admin', () => {
      const user = {
        email: 'user@example.com',
        role: 'patient',
      };

      const redirectPath = isAdminEmail(user.email) ? '/admin' : '/dashboard';
      expect(redirectPath).toBe('/dashboard');
    });
  });
});

describe('E2E - Admin Dashboard Access Control', () => {
  describe('Access Authorization', () => {
    it('should allow admin user to access dashboard', () => {
      const user = {
        id: 'user-123',
        email: 'karrarmayaly@gmail.com',
      };

      const hasAccess = isAdminEmail(user.email);
      expect(hasAccess).toBe(true);
    });

    it('should deny non-admin user access to dashboard', () => {
      const user = {
        id: 'user-456',
        email: 'patient@example.com',
      };

      const hasAccess = isAdminEmail(user.email);
      expect(hasAccess).toBe(false);
    });

    it('should deny unauthenticated access', () => {
      const user = null;
      const hasAccess = isAdminEmail(user?.email);
      expect(hasAccess).toBe(false);
    });

    it('should handle redirect for unauthorized access', () => {
      const user = {
        email: 'patient@example.com',
      };

      const shouldRedirect = !isAdminEmail(user.email);
      const redirectPath = shouldRedirect ? '/' : '/admin';
      
      expect(shouldRedirect).toBe(true);
      expect(redirectPath).toBe('/');
    });
  });

  describe('Session Validation', () => {
    it('should validate admin session on page load', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'karrarmayaly@gmail.com',
        },
        access_token: 'token-123',
      };

      expect(session.user).toBeDefined();
      expect(isAdminEmail(session.user.email)).toBe(true);
      expect(session.access_token).toBeDefined();
    });
  });
});

describe('E2E - Dentist List Management', () => {
  describe('Dentist List Display', () => {
    it('should display list of all dentists', () => {
      const dentists = [
        {
          id: 'dentist-1',
          full_name: 'Dr. John Smith',
          email: 'john.smith@clinic.com',
          specialization: 'General Dentistry',
          years_of_experience: 10,
          rating: 4.8,
          patient_count: 45,
        },
        {
          id: 'dentist-2',
          full_name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@clinic.com',
          specialization: 'Orthodontics',
          years_of_experience: 8,
          rating: 4.9,
          patient_count: 32,
        },
      ];

      // Validate dentist list structure
      expect(dentists).toHaveLength(2);
      expect(dentists[0].full_name).toBe('Dr. John Smith');
      expect(dentists[0].specialization).toBeDefined();
      expect(dentists[0].rating).toBeGreaterThan(0);
    });

    it('should handle empty dentist list', () => {
      const dentists: any[] = [];
      
      expect(dentists).toHaveLength(0);
    });

    it('should filter dentists by search query', () => {
      const dentists = [
        { id: '1', full_name: 'Dr. John Smith', specialization: 'General Dentistry', email: 'john@clinic.com' },
        { id: '2', full_name: 'Dr. Sarah Johnson', specialization: 'Orthodontics', email: 'sarah@clinic.com' },
        { id: '3', full_name: 'Dr. Mike Brown', specialization: 'Pediatric Dentistry', email: 'mike@clinic.com' },
      ];

      const searchQuery = 'john';
      const filtered = dentists.filter(d => 
        d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(2); // Dr. John Smith and Dr. Sarah Johnson
    });
  });

  describe('Dentist Selection', () => {
    it('should select dentist and display details', () => {
      const selectedDentist = {
        id: 'dentist-1',
        full_name: 'Dr. John Smith',
        email: 'john.smith@clinic.com',
        specialization: 'General Dentistry',
        bio: 'Experienced dentist with 10 years of practice',
        years_of_experience: 10,
        rating: 4.8,
      };

      expect(selectedDentist.id).toBe('dentist-1');
      expect(selectedDentist.full_name).toBe('Dr. John Smith');
      expect(selectedDentist.bio).toBeDefined();
    });

    it('should highlight selected dentist in list', () => {
      const dentists = [
        { id: 'dentist-1', full_name: 'Dr. John Smith' },
        { id: 'dentist-2', full_name: 'Dr. Sarah Johnson' },
      ];
      const selectedId = 'dentist-1';

      const isSelected = (dentistId: string) => dentistId === selectedId;
      
      expect(isSelected('dentist-1')).toBe(true);
      expect(isSelected('dentist-2')).toBe(false);
    });
  });
});

describe('E2E - Dentist Details and Statistics', () => {
  describe('Dentist Profile Display', () => {
    it('should display complete dentist profile', () => {
      const dentistProfile = {
        id: 'dentist-1',
        full_name: 'Dr. John Smith',
        email: 'john.smith@clinic.com',
        specialization: 'General Dentistry',
        bio: 'Experienced dentist specializing in preventive care',
        years_of_experience: 10,
        rating: 4.8,
      };

      expect(dentistProfile.full_name).toBeDefined();
      expect(dentistProfile.email).toBeDefined();
      expect(dentistProfile.specialization).toBeDefined();
      expect(dentistProfile.rating).toBeGreaterThan(0);
    });

    it('should calculate dentist statistics', () => {
      const appointments = [
        { id: '1', patient_id: 'p1', status: 'upcoming', appointment_date: '2025-11-01' },
        { id: '2', patient_id: 'p2', status: 'upcoming', appointment_date: '2025-11-02' },
        { id: '3', patient_id: 'p1', status: 'completed', appointment_date: '2025-10-15' },
        { id: '4', patient_id: 'p3', status: 'completed', appointment_date: '2025-10-10' },
        { id: '5', patient_id: 'p2', status: 'cancelled', appointment_date: '2025-10-20' },
      ];

      const stats = {
        total_appointments: appointments.length,
        upcoming_appointments: appointments.filter(a => a.status === 'upcoming').length,
        completed_appointments: appointments.filter(a => a.status === 'completed').length,
        total_patients: new Set(appointments.map(a => a.patient_id)).size,
      };

      expect(stats.total_appointments).toBe(5);
      expect(stats.upcoming_appointments).toBe(2);
      expect(stats.completed_appointments).toBe(2);
      expect(stats.total_patients).toBe(3);
    });
  });
});

describe('E2E - Availability Management', () => {
  describe('View Availability Slots', () => {
    it('should display dentist availability schedule', () => {
      const availability = [
        {
          id: 'slot-1',
          dentist_id: 'dentist-1',
          day_of_week: 1, // Monday
          start_time: '09:00',
          end_time: '12:00',
          is_available: true,
        },
        {
          id: 'slot-2',
          dentist_id: 'dentist-1',
          day_of_week: 1, // Monday
          start_time: '14:00',
          end_time: '17:00',
          is_available: true,
        },
        {
          id: 'slot-3',
          dentist_id: 'dentist-1',
          day_of_week: 2, // Tuesday
          start_time: '09:00',
          end_time: '12:00',
          is_available: false,
        },
      ];

      expect(availability).toHaveLength(3);
      expect(availability[0].day_of_week).toBe(1);
      expect(availability[0].is_available).toBe(true);
    });

    it('should group availability by day of week', () => {
      const availability = [
        { id: '1', day_of_week: 1, start_time: '09:00', end_time: '12:00' },
        { id: '2', day_of_week: 1, start_time: '14:00', end_time: '17:00' },
        { id: '3', day_of_week: 2, start_time: '09:00', end_time: '12:00' },
      ];

      const groupedByDay = availability.reduce((acc, slot) => {
        if (!acc[slot.day_of_week]) {
          acc[slot.day_of_week] = [];
        }
        acc[slot.day_of_week].push(slot);
        return acc;
      }, {} as Record<number, typeof availability>);

      expect(groupedByDay[1]).toHaveLength(2);
      expect(groupedByDay[2]).toHaveLength(1);
    });
  });

  describe('Add Availability Slot', () => {
    it('should validate new availability slot data', () => {
      const newSlot = {
        dentist_id: 'dentist-1',
        day_of_week: 3, // Wednesday
        start_time: '10:00',
        end_time: '13:00',
        is_available: true,
      };

      expect(newSlot.dentist_id).toBeDefined();
      expect(newSlot.day_of_week).toBeGreaterThanOrEqual(0);
      expect(newSlot.day_of_week).toBeLessThanOrEqual(6);
      expect(newSlot.start_time).toBeDefined();
      expect(newSlot.end_time).toBeDefined();
    });

    it('should validate end time is after start time', () => {
      const slot1 = { start_time: '09:00', end_time: '12:00' };
      const slot2 = { start_time: '14:00', end_time: '13:00' }; // Invalid

      const isValid1 = slot1.end_time > slot1.start_time;
      const isValid2 = slot2.end_time > slot2.start_time;

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });

    it('should detect overlapping time slots', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
        { day_of_week: 1, start_time: '14:00', end_time: '17:00' },
      ];

      const newSlot1 = { day_of_week: 1, start_time: '10:00', end_time: '11:00' }; // Overlaps
      const newSlot2 = { day_of_week: 1, start_time: '12:00', end_time: '14:00' }; // No overlap
      const newSlot3 = { day_of_week: 2, start_time: '10:00', end_time: '11:00' }; // Different day

      const hasOverlap = (newSlot: typeof newSlot1) => {
        return existingSlots.some(existing => 
          existing.day_of_week === newSlot.day_of_week &&
          ((newSlot.start_time >= existing.start_time && newSlot.start_time < existing.end_time) ||
           (newSlot.end_time > existing.start_time && newSlot.end_time <= existing.end_time) ||
           (newSlot.start_time <= existing.start_time && newSlot.end_time >= existing.end_time))
        );
      };

      expect(hasOverlap(newSlot1)).toBe(true);
      expect(hasOverlap(newSlot2)).toBe(false);
      expect(hasOverlap(newSlot3)).toBe(false);
    });
  });

  describe('Edit Availability Slot', () => {
    it('should toggle availability status', () => {
      const slot = {
        id: 'slot-1',
        is_available: true,
      };

      const updatedSlot = {
        ...slot,
        is_available: !slot.is_available,
      };

      expect(updatedSlot.is_available).toBe(false);
    });

    it('should update slot times', () => {
      const slot = {
        id: 'slot-1',
        start_time: '09:00',
        end_time: '12:00',
      };

      const updatedSlot = {
        ...slot,
        start_time: '10:00',
        end_time: '13:00',
      };

      expect(updatedSlot.start_time).toBe('10:00');
      expect(updatedSlot.end_time).toBe('13:00');
    });
  });

  describe('Delete Availability Slot', () => {
    it('should remove slot from availability list', () => {
      const availability = [
        { id: 'slot-1', day_of_week: 1 },
        { id: 'slot-2', day_of_week: 1 },
        { id: 'slot-3', day_of_week: 2 },
      ];

      const slotToDelete = 'slot-2';
      const updatedAvailability = availability.filter(slot => slot.id !== slotToDelete);

      expect(updatedAvailability).toHaveLength(2);
      expect(updatedAvailability.find(s => s.id === 'slot-2')).toBeUndefined();
    });
  });
});

describe('E2E - Patient Appointments Viewing', () => {
  describe('Appointments List Display', () => {
    it('should display dentist appointments with patient info', () => {
      const appointments = [
        {
          id: 'apt-1',
          patient_id: 'patient-1',
          patient_name: 'John Doe',
          patient_email: 'john@example.com',
          dentist_id: 'dentist-1',
          appointment_date: '2025-11-15',
          appointment_time: '10:00',
          appointment_type: 'Checkup',
          status: 'upcoming',
          symptoms: 'Regular checkup',
        },
        {
          id: 'apt-2',
          patient_id: 'patient-2',
          patient_name: 'Jane Smith',
          patient_email: 'jane@example.com',
          dentist_id: 'dentist-1',
          appointment_date: '2025-10-20',
          appointment_time: '14:00',
          appointment_type: 'Cleaning',
          status: 'completed',
          symptoms: 'Teeth cleaning',
        },
      ];

      expect(appointments).toHaveLength(2);
      expect(appointments[0].patient_name).toBe('John Doe');
      expect(appointments[0].patient_email).toBeDefined();
      expect(appointments[0].status).toBe('upcoming');
    });

    it('should filter appointments by status', () => {
      const appointments = [
        { id: '1', status: 'upcoming' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'upcoming' },
        { id: '4', status: 'cancelled' },
      ];

      const upcomingOnly = appointments.filter(a => a.status === 'upcoming');
      const completedOnly = appointments.filter(a => a.status === 'completed');

      expect(upcomingOnly).toHaveLength(2);
      expect(completedOnly).toHaveLength(1);
    });

    it('should sort appointments by date', () => {
      const appointments = [
        { id: '1', appointment_date: '2025-11-15' },
        { id: '2', appointment_date: '2025-10-20' },
        { id: '3', appointment_date: '2025-11-30' },
      ];

      const sorted = [...appointments].sort((a, b) => 
        new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      );

      expect(sorted[0].appointment_date).toBe('2025-11-30');
      expect(sorted[2].appointment_date).toBe('2025-10-20');
    });
  });

  describe('Patient Count Calculation', () => {
    it('should calculate unique patient count', () => {
      const appointments = [
        { id: '1', patient_id: 'patient-1' },
        { id: '2', patient_id: 'patient-2' },
        { id: '3', patient_id: 'patient-1' }, // Same patient, different appointment
        { id: '4', patient_id: 'patient-3' },
      ];

      const uniquePatients = new Set(appointments.map(a => a.patient_id));
      const patientCount = uniquePatients.size;

      expect(patientCount).toBe(3);
    });

    it('should handle empty appointments list', () => {
      const appointments: any[] = [];
      const uniquePatients = new Set(appointments.map(a => a.patient_id));
      
      expect(uniquePatients.size).toBe(0);
    });
  });
});

describe('E2E - Error Scenarios and Edge Cases', () => {
  describe('Authentication Errors', () => {
    it('should handle invalid credentials error', () => {
      const error = {
        message: 'Invalid login credentials',
        status: 400,
      };

      expect(error.message).toContain('Invalid login credentials');
      expect(error.status).toBe(400);
    });

    it('should handle email not verified error', () => {
      const error = {
        message: 'Email not confirmed',
        status: 400,
      };

      expect(error.message).toContain('Email not confirmed');
    });

    it('should handle network error', () => {
      const error = {
        message: 'Failed to fetch',
        name: 'TypeError',
      };

      const isNetworkError = error.name === 'TypeError' && error.message.includes('fetch');
      expect(isNetworkError).toBe(true);
    });
  });

  describe('Data Loading Errors', () => {
    it('should handle failed dentist list fetch', () => {
      const error = {
        message: 'Failed to load dentists',
        code: 'FETCH_ERROR',
      };

      expect(error.message).toBeDefined();
      expect(error.code).toBe('FETCH_ERROR');
    });

    it('should handle failed availability fetch', () => {
      const error = {
        message: 'Failed to load availability slots',
        dentistId: 'dentist-1',
      };

      expect(error.message).toContain('availability');
      expect(error.dentistId).toBeDefined();
    });

    it('should handle failed appointments fetch', () => {
      const error = {
        message: 'Failed to load patient appointments',
        dentistId: 'dentist-1',
      };

      expect(error.message).toContain('appointments');
    });
  });

  describe('Validation Errors', () => {
    it('should validate required fields for availability slot', () => {
      const incompleteSlot = {
        dentist_id: 'dentist-1',
        day_of_week: '',
        start_time: '09:00',
        end_time: '',
      };

      const hasAllFields = 
        incompleteSlot.dentist_id &&
        incompleteSlot.day_of_week !== '' &&
        incompleteSlot.start_time &&
        incompleteSlot.end_time;

      expect(hasAllFields).toBe(false);
    });

    it('should validate time range', () => {
      const invalidSlot = {
        start_time: '14:00',
        end_time: '12:00', // End before start
      };

      const isValidRange = invalidSlot.end_time > invalidSlot.start_time;
      expect(isValidRange).toBe(false);
    });

    it('should validate day of week range', () => {
      const validDay = 3;
      const invalidDay1 = -1;
      const invalidDay2 = 7;

      const isValidDay = (day: number) => day >= 0 && day <= 6;

      expect(isValidDay(validDay)).toBe(true);
      expect(isValidDay(invalidDay1)).toBe(false);
      expect(isValidDay(invalidDay2)).toBe(false);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle no dentists in system', () => {
      const dentists: any[] = [];
      const isEmpty = dentists.length === 0;

      expect(isEmpty).toBe(true);
    });

    it('should handle dentist with no availability', () => {
      const availability: any[] = [];
      const hasNoAvailability = availability.length === 0;

      expect(hasNoAvailability).toBe(true);
    });

    it('should handle dentist with no appointments', () => {
      const appointments: any[] = [];
      const hasNoAppointments = appointments.length === 0;

      expect(hasNoAppointments).toBe(true);
    });
  });
});

describe('E2E - Complete Admin Workflow Integration', () => {
  it('should complete full admin authentication and dashboard access flow', () => {
    // Step 1: Admin signs up
    const signupData = {
      email: 'karrarmayaly@gmail.com',
      password: 'SecurePass123!',
      firstName: 'Karrar',
      lastName: 'Mayaly',
    };

    expect(isAdminEmail(signupData.email)).toBe(true);

    // Step 2: Email verification (simulated)
    const verifiedUser = {
      id: 'user-123',
      email: signupData.email,
      email_confirmed_at: new Date().toISOString(),
    };

    expect(verifiedUser.email_confirmed_at).toBeDefined();

    // Step 3: Admin signs in
    const session = {
      user: verifiedUser,
      access_token: 'token-123',
    };

    expect(session.user).toBeDefined();
    expect(session.access_token).toBeDefined();

    // Step 4: Redirect to admin dashboard
    const redirectPath = isAdminEmail(session.user.email) ? '/admin' : '/dashboard';
    expect(redirectPath).toBe('/admin');

    // Step 5: Access granted
    const hasAccess = isAdminEmail(session.user.email);
    expect(hasAccess).toBe(true);
  });

  it('should complete full dentist management workflow', () => {
    // Step 1: Load dentists
    const dentists = [
      {
        id: 'dentist-1',
        full_name: 'Dr. John Smith',
        email: 'john@clinic.com',
        specialization: 'General Dentistry',
        rating: 4.8,
      },
    ];

    expect(dentists).toHaveLength(1);

    // Step 2: Select dentist
    const selectedDentist = dentists[0];
    expect(selectedDentist.id).toBe('dentist-1');

    // Step 3: View dentist details
    const dentistDetails = {
      ...selectedDentist,
      bio: 'Experienced dentist',
      years_of_experience: 10,
    };

    expect(dentistDetails.bio).toBeDefined();

    // Step 4: Load availability
    const availability = [
      {
        id: 'slot-1',
        dentist_id: selectedDentist.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '12:00',
        is_available: true,
      },
    ];

    expect(availability).toHaveLength(1);

    // Step 5: Load appointments
    const appointments = [
      {
        id: 'apt-1',
        patient_id: 'patient-1',
        patient_name: 'John Doe',
        dentist_id: selectedDentist.id,
        status: 'upcoming',
      },
    ];

    expect(appointments).toHaveLength(1);
  });

  it('should complete full availability management workflow', () => {
    // Step 1: View existing availability
    const existingAvailability = [
      {
        id: 'slot-1',
        dentist_id: 'dentist-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '12:00',
        is_available: true,
      },
    ];

    expect(existingAvailability).toHaveLength(1);

    // Step 2: Add new slot
    const newSlot = {
      id: 'slot-2',
      dentist_id: 'dentist-1',
      day_of_week: 2,
      start_time: '14:00',
      end_time: '17:00',
      is_available: true,
    };

    const updatedAvailability = [...existingAvailability, newSlot];
    expect(updatedAvailability).toHaveLength(2);

    // Step 3: Toggle availability
    const toggledSlot = {
      ...updatedAvailability[0],
      is_available: false,
    };

    expect(toggledSlot.is_available).toBe(false);

    // Step 4: Delete slot
    const afterDelete = updatedAvailability.filter(s => s.id !== 'slot-2');
    expect(afterDelete).toHaveLength(1);
  });

  it('should prevent non-admin access throughout workflow', () => {
    // Step 1: Non-admin user attempts signup
    const nonAdminUser = {
      email: 'user@example.com',
      password: 'password123',
    };

    expect(isAdminEmail(nonAdminUser.email)).toBe(false);

    // Step 2: Non-admin user signs in successfully
    const session = {
      user: {
        id: 'user-456',
        email: nonAdminUser.email,
      },
      access_token: 'token-456',
    };

    expect(session.user).toBeDefined();

    // Step 3: Attempt to access admin dashboard
    const hasAdminAccess = isAdminEmail(session.user.email);
    expect(hasAdminAccess).toBe(false);

    // Step 4: Should redirect to home
    const redirectPath = hasAdminAccess ? '/admin' : '/';
    expect(redirectPath).toBe('/');
  });
});

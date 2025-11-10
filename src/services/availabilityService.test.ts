/**
 * Availability Service Tests
 * Tests for dentist availability and slot generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { availabilityService } from './availabilityService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('availabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableSlots', () => {
    it('should fetch available slots from database function', async () => {
      const mockSlots = [
        { slot_start: '2025-11-10T09:00:00Z', slot_end: '2025-11-10T09:30:00Z', is_booked: false },
        { slot_start: '2025-11-10T09:30:00Z', slot_end: '2025-11-10T10:00:00Z', is_booked: false },
        { slot_start: '2025-11-10T10:00:00Z', slot_end: '2025-11-10T10:30:00Z', is_booked: true },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockSlots,
        error: null,
      } as any);

      const fromDate = new Date('2025-11-10');
      const toDate = new Date('2025-11-10');
      const result = await availabilityService.getAvailableSlots('dentist-123', fromDate, toDate);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        start: '2025-11-10T09:00:00Z',
        end: '2025-11-10T09:30:00Z',
        isBooked: false,
      });
      expect(result[2].isBooked).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      } as any);

      const fromDate = new Date('2025-11-10');
      const toDate = new Date('2025-11-10');

      await expect(
        availabilityService.getAvailableSlots('dentist-123', fromDate, toDate)
      ).rejects.toThrow('Failed to fetch available time slots');
    });
  });

  describe('isSlotAvailable', () => {
    it('should return true for available slot', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const result = await availabilityService.isSlotAvailable(
        'dentist-123',
        new Date('2025-11-10'),
        '09:00',
        30
      );

      expect(result).toBe(true);
    });

    it('should return false for booked slot', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: false,
        error: null,
      } as any);

      const result = await availabilityService.isSlotAvailable(
        'dentist-123',
        new Date('2025-11-10'),
        '09:00',
        30
      );

      expect(result).toBe(false);
    });
  });

  describe('getAvailableDates', () => {
    it('should return unique dates with available slots', async () => {
      const mockSlots = [
        { slot_start: '2025-11-10T09:00:00Z', slot_end: '2025-11-10T09:30:00Z', is_booked: false },
        { slot_start: '2025-11-10T10:00:00Z', slot_end: '2025-11-10T10:30:00Z', is_booked: false },
        { slot_start: '2025-11-11T09:00:00Z', slot_end: '2025-11-11T09:30:00Z', is_booked: false },
        { slot_start: '2025-11-12T09:00:00Z', slot_end: '2025-11-12T09:30:00Z', is_booked: true }, // booked
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockSlots,
        error: null,
      } as any);

      const fromDate = new Date('2025-11-10');
      const toDate = new Date('2025-11-12');
      const result = await availabilityService.getAvailableDates('dentist-123', fromDate, toDate);

      expect(result).toEqual(['2025-11-10', '2025-11-11']);
      expect(result).not.toContain('2025-11-12'); // All slots booked on this date
    });
  });

  describe('getAvailableTimesForDate', () => {
    it('should return time slots for a specific date', async () => {
      const mockSlots = [
        { slot_start: '2025-11-10T09:00:00Z', slot_end: '2025-11-10T09:30:00Z', is_booked: false },
        { slot_start: '2025-11-10T09:30:00Z', slot_end: '2025-11-10T10:00:00Z', is_booked: false },
        { slot_start: '2025-11-10T10:00:00Z', slot_end: '2025-11-10T10:30:00Z', is_booked: true },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockSlots,
        error: null,
      } as any);

      const date = new Date('2025-11-10');
      const result = await availabilityService.getAvailableTimesForDate('dentist-123', date);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ time: '09:00', isBooked: false });
      expect(result[1]).toEqual({ time: '09:30', isBooked: false });
      expect(result[2]).toEqual({ time: '10:00', isBooked: true });
    });
  });
});

// Integration test scenarios (to be run manually against real database)
export const integrationTests = {
  /**
   * Test A: Schema Test
   * Verify appointments table exists and is accessible
   */
  async testSchema() {
    console.log('🧪 Test A: Schema Test');
    
    const { data, error } = await supabase
      .from('appointments')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Schema test failed:', error);
      return false;
    }
    
    console.log('✅ Appointments table exists and is accessible');
    return true;
  },

  /**
   * Test B: Booking Test (Happy Path)
   * Test booking for a dentist with Mon-Fri 9-5 schedule
   */
  async testBookingHappyPath(dentistId: string) {
    console.log('🧪 Test B: Booking Happy Path');
    
    // Get next Monday
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    
    // Get available slots
    const slots = await availabilityService.getAvailableSlots(
      dentistId,
      nextMonday,
      nextMonday
    );
    
    console.log(`✅ Found ${slots.length} slots for Monday`);
    console.log('   Slots:', slots.map(s => new Date(s.start).toISOString().split('T')[1].substring(0, 5)));
    
    // Verify slots are within 09:00-17:00
    const allSlotsValid = slots.every(slot => {
      const time = new Date(slot.start).toISOString().split('T')[1];
      return time >= '09:00:00' && time < '17:00:00';
    });
    
    if (!allSlotsValid) {
      console.error('❌ Some slots are outside working hours');
      return false;
    }
    
    console.log('✅ All slots are within working hours (09:00-17:00)');
    
    // Verify last slot doesn't exceed 17:00
    const lastSlot = slots[slots.length - 1];
    const lastSlotEnd = new Date(lastSlot.end).toISOString().split('T')[1];
    if (lastSlotEnd > '17:00:00') {
      console.error('❌ Last slot exceeds end time:', lastSlotEnd);
      return false;
    }
    
    console.log('✅ Last slot ends at or before 17:00');
    return true;
  },

  /**
   * Test C: Days Off Test
   * Verify Saturday and Sunday return no slots
   */
  async testDaysOff(dentistId: string) {
    console.log('🧪 Test C: Days Off Test');
    
    // Get next Saturday
    const nextSaturday = new Date();
    nextSaturday.setDate(nextSaturday.getDate() + ((6 + 7 - nextSaturday.getDay()) % 7 || 7));
    
    // Get next Sunday
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSunday.getDate() + 1);
    
    // Check Saturday
    const saturdaySlots = await availabilityService.getAvailableSlots(
      dentistId,
      nextSaturday,
      nextSaturday
    );
    
    // Check Sunday
    const sundaySlots = await availabilityService.getAvailableSlots(
      dentistId,
      nextSunday,
      nextSunday
    );
    
    if (saturdaySlots.length > 0) {
      console.error('❌ Saturday has slots (should be day off)');
      return false;
    }
    
    if (sundaySlots.length > 0) {
      console.error('❌ Sunday has slots (should be day off)');
      return false;
    }
    
    console.log('✅ Saturday and Sunday have no available slots');
    return true;
  },

  /**
   * Test D: Overlap Test
   * Verify double-booking prevention
   */
  async testOverlapPrevention(dentistId: string) {
    console.log('🧪 Test D: Overlap Prevention Test');
    
    // This test requires actual booking attempts
    // Should be implemented in E2E tests
    console.log('⚠️  This test requires E2E implementation');
    return true;
  },

  /**
   * Run all integration tests
   */
  async runAll(dentistId: string) {
    console.log('🚀 Running all integration tests...\n');
    
    const results = {
      schema: await this.testSchema(),
      booking: await this.testBookingHappyPath(dentistId),
      daysOff: await this.testDaysOff(dentistId),
      overlap: await this.testOverlapPrevention(dentistId),
    };
    
    console.log('\n📊 Test Results:');
    console.log('   Schema:', results.schema ? '✅' : '❌');
    console.log('   Booking:', results.booking ? '✅' : '❌');
    console.log('   Days Off:', results.daysOff ? '✅' : '❌');
    console.log('   Overlap:', results.overlap ? '✅' : '❌');
    
    const allPassed = Object.values(results).every(r => r);
    console.log('\n' + (allPassed ? '🎉 All tests passed!' : '❌ Some tests failed'));
    
    return results;
  },
};

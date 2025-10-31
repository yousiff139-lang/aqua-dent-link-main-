import { describe, it, expect } from 'vitest';
import { generateTimeSlotsForDate, getDayName, formatTime } from '@/hooks/useDentistAvailability';
import type { DentistAvailability } from '@/hooks/useDentistAvailability';

describe('Dentist Availability Functions', () => {
  describe('getDayName', () => {
    it('should return correct day names', () => {
      expect(getDayName(0)).toBe('Sunday');
      expect(getDayName(1)).toBe('Monday');
      expect(getDayName(6)).toBe('Saturday');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime('09:00:00')).toBe('9:00 AM');
      expect(formatTime('13:30:00')).toBe('1:30 PM');
      expect(formatTime('00:00:00')).toBe('12:00 AM');
      expect(formatTime('12:00:00')).toBe('12:00 PM');
    });
  });

  describe('generateTimeSlotsForDate', () => {
    it('should generate time slots for a given date', () => {
      const date = new Date('2024-01-15'); // Monday
      const availability: DentistAvailability[] = [
        {
          id: '1',
          dentist_id: 'dentist-1',
          day_of_week: 1, // Monday
          start_time: '09:00:00',
          end_time: '11:00:00',
          is_available: true,
          slot_duration_minutes: 30,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      const bookedSlots: string[] = [];

      const slots = generateTimeSlotsForDate(date, availability, bookedSlots);

      expect(slots.length).toBe(4); // 9:00, 9:30, 10:00, 10:30
      expect(slots[0].time).toBe('09:00');
      expect(slots[0].isBooked).toBe(false);
      expect(slots[0].isAvailable).toBe(true);
    });

    it('should mark booked slots correctly', () => {
      const date = new Date('2024-01-15'); // Monday
      const availability: DentistAvailability[] = [
        {
          id: '1',
          dentist_id: 'dentist-1',
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '10:00:00',
          is_available: true,
          slot_duration_minutes: 30,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      const bookedSlots = ['09:00'];

      const slots = generateTimeSlotsForDate(date, availability, bookedSlots);

      expect(slots[0].time).toBe('09:00');
      expect(slots[0].isBooked).toBe(true);
      expect(slots[1].time).toBe('09:30');
      expect(slots[1].isBooked).toBe(false);
    });

    it('should return empty array when no availability for the day', () => {
      const date = new Date('2024-01-15'); // Monday
      const availability: DentistAvailability[] = [
        {
          id: '1',
          dentist_id: 'dentist-1',
          day_of_week: 2, // Tuesday
          start_time: '09:00:00',
          end_time: '10:00:00',
          is_available: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      const bookedSlots: string[] = [];

      const slots = generateTimeSlotsForDate(date, availability, bookedSlots);

      expect(slots.length).toBe(0);
    });

    it('should handle multiple availability periods in a day', () => {
      const date = new Date('2024-01-15'); // Monday
      const availability: DentistAvailability[] = [
        {
          id: '1',
          dentist_id: 'dentist-1',
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '10:00:00',
          is_available: true,
          slot_duration_minutes: 30,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          dentist_id: 'dentist-1',
          day_of_week: 1,
          start_time: '14:00:00',
          end_time: '15:00:00',
          is_available: true,
          slot_duration_minutes: 30,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      const bookedSlots: string[] = [];

      const slots = generateTimeSlotsForDate(date, availability, bookedSlots);

      expect(slots.length).toBe(4); // 2 slots in morning + 2 slots in afternoon
      expect(slots[0].time).toBe('09:00');
      expect(slots[2].time).toBe('14:00');
    });
  });
});

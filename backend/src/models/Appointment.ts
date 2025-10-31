import { query } from '../config/database';

export interface Appointment {
  id?: number;
  patient_id: number;
  dentist_id: number;
  date: Date;
  status?: string;
  notes?: string;
  symptoms?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AppointmentWithDetails extends Appointment {
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  dentist_name?: string;
  dentist_specialty?: string;
}

export class AppointmentModel {
  /**
   * Create new appointment
   */
  static async create(appointment: Appointment): Promise<number> {
    const result: any = await query(
      'INSERT INTO appointments (patient_id, dentist_id, date, status, notes, symptoms) VALUES (?, ?, ?, ?, ?, ?)',
      [
        appointment.patient_id,
        appointment.dentist_id,
        appointment.date,
        appointment.status || 'pending',
        appointment.notes || null,
        appointment.symptoms || null
      ]
    );
    
    return result.insertId;
  }

  /**
   * Get appointments by patient ID
   */
  static async getByPatientId(patientId: number): Promise<AppointmentWithDetails[]> {
    const results: any = await query(
      `SELECT a.*, d.name as dentist_name, d.specialty as dentist_specialty
       FROM appointments a
       JOIN dentists d ON a.dentist_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.date DESC`,
      [patientId]
    );
    
    return results;
  }

  /**
   * Get appointments by dentist ID
   */
  static async getByDentistId(dentistId: number): Promise<AppointmentWithDetails[]> {
    const results: any = await query(
      `SELECT a.*, p.full_name as patient_name, p.email as patient_email, p.phone as patient_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.dentist_id = ?
       ORDER BY a.date DESC`,
      [dentistId]
    );
    
    return results;
  }

  /**
   * Get appointment by ID
   */
  static async findById(id: number): Promise<AppointmentWithDetails | null> {
    const results: any = await query(
      `SELECT a.*, 
              p.full_name as patient_name, p.email as patient_email, p.phone as patient_phone,
              d.name as dentist_name, d.specialty as dentist_specialty
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [id]
    );
    
    return results[0] || null;
  }

  /**
   * Update appointment status
   */
  static async updateStatus(id: number, status: string): Promise<boolean> {
    await query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, id]
    );
    
    return true;
  }

  /**
   * Get all appointments (admin)
   */
  static async getAll(): Promise<AppointmentWithDetails[]> {
    const results: any = await query(
      `SELECT a.*, 
              p.full_name as patient_name,
              d.name as dentist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN dentists d ON a.dentist_id = d.id
       ORDER BY a.date DESC`
    );
    
    return results;
  }
}

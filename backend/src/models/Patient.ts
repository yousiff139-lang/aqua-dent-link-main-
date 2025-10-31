import { query } from '../config/database';
import bcrypt from 'bcrypt';

export interface Patient {
  id?: number;
  full_name: string;
  email: string;
  password?: string;
  phone?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PatientModel {
  /**
   * Create new patient
   */
  static async create(patient: Patient): Promise<number> {
    const hashedPassword = await bcrypt.hash(patient.password!, 10);
    
    const result: any = await query(
      'INSERT INTO patients (full_name, email, password, phone) VALUES (?, ?, ?, ?)',
      [patient.full_name, patient.email, hashedPassword, patient.phone || null]
    );
    
    return result.insertId;
  }

  /**
   * Find patient by email
   */
  static async findByEmail(email: string): Promise<Patient | null> {
    const results: any = await query(
      'SELECT * FROM patients WHERE email = ?',
      [email]
    );
    
    return results[0] || null;
  }

  /**
   * Find patient by ID
   */
  static async findById(id: number): Promise<Patient | null> {
    const results: any = await query(
      'SELECT id, full_name, email, phone, created_at FROM patients WHERE id = ?',
      [id]
    );
    
    return results[0] || null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get all patients (admin only)
   */
  static async getAll(): Promise<Patient[]> {
    const results: any = await query(
      'SELECT id, full_name, email, phone, created_at FROM patients ORDER BY created_at DESC'
    );
    
    return results;
  }

  /**
   * Update patient
   */
  static async update(id: number, data: Partial<Patient>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.full_name) {
      fields.push('full_name = ?');
      values.push(data.full_name);
    }
    if (data.phone) {
      fields.push('phone = ?');
      values.push(data.phone);
    }

    if (fields.length === 0) return false;

    values.push(id);
    
    await query(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return true;
  }
}

import { query } from '../config/database';
import bcrypt from 'bcrypt';

export interface Dentist {
  id?: number;
  name: string;
  specialty: string;
  email: string;
  password?: string;
  phone?: string;
  rating?: number;
  bio?: string;
  experience_years?: number;
  available_days?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export class DentistModel {
  /**
   * Find dentist by email
   */
  static async findByEmail(email: string): Promise<Dentist | null> {
    const results: any = await query(
      'SELECT * FROM dentists WHERE email = ?',
      [email]
    );
    
    if (results[0] && results[0].available_days) {
      results[0].available_days = JSON.parse(results[0].available_days);
    }
    
    return results[0] || null;
  }

  /**
   * Find dentist by ID
   */
  static async findById(id: number): Promise<Dentist | null> {
    const results: any = await query(
      'SELECT id, name, specialty, email, phone, rating, bio, experience_years, available_days FROM dentists WHERE id = ?',
      [id]
    );
    
    if (results[0] && results[0].available_days) {
      results[0].available_days = JSON.parse(results[0].available_days);
    }
    
    return results[0] || null;
  }

  /**
   * Get all dentists
   */
  static async getAll(): Promise<Dentist[]> {
    const results: any = await query(
      'SELECT id, name, specialty, email, phone, rating, bio, experience_years, available_days FROM dentists ORDER BY rating DESC'
    );
    
    return results.map((dentist: any) => ({
      ...dentist,
      available_days: dentist.available_days ? JSON.parse(dentist.available_days) : []
    }));
  }

  /**
   * Get dentists by specialty
   */
  static async getBySpecialty(specialty: string): Promise<Dentist[]> {
    const results: any = await query(
      'SELECT id, name, specialty, email, phone, rating, bio, experience_years, available_days FROM dentists WHERE specialty = ? ORDER BY rating DESC',
      [specialty]
    );
    
    return results.map((dentist: any) => ({
      ...dentist,
      available_days: dentist.available_days ? JSON.parse(dentist.available_days) : []
    }));
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

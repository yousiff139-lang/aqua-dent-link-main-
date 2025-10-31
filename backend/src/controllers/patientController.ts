import { Request, Response } from 'express';
import { PatientModel } from '../models/Patient';
import { generateToken } from '../middlewares/auth';
import { body, validationResult } from 'express-validator';

/**
 * Patient Controller
 * Handles patient registration, login, and profile management
 */
export class PatientController {
  /**
   * Register new patient
   * POST /api/patients/register
   */
  static async register(req: Request, res: Response) {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { full_name, email, password, phone } = req.body;

      // Check if email exists
      const existingPatient = await PatientModel.findByEmail(email);
      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Create patient
      const patientId = await PatientModel.create({
        full_name,
        email,
        password,
        phone
      });

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: { patient_id: patientId }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  /**
   * Login patient
   * POST /api/patients/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find patient
      const patient = await PatientModel.findByEmail(email);
      if (!patient) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValid = await PatientModel.verifyPassword(password, patient.password!);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = generateToken({
        id: patient.id!,
        email: patient.email,
        type: 'patient'
      });

      // Remove password from response
      const { password: _, ...patientData } = patient;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          patient: patientData
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  /**
   * Get patient by ID
   * GET /api/patients/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const patient = await PatientModel.findById(parseInt(id));
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

/**
 * Validation rules
 */
export const registerValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional()
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

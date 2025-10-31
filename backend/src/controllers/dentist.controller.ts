import { Request, Response } from 'express';
import { dentistService } from '../services/dentist.service.js';
import { logger } from '../config/logger.js';

export const dentistController = {
  /**
   * Login dentist with email
   */
  login: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const result = await dentistService.login(email);

      if (!result) {
        return res.status(401).json({ message: 'Invalid email or dentist not found' });
      }

      res.json(result);
    } catch (error) {
      logger.error('Dentist login error', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /**
   * Get dentist profile by email
   */
  getByEmail: async (req: Request, res: Response) => {
    try {
      const { email } = req.params;

      const dentist = await dentistService.getByEmail(email);

      if (!dentist) {
        return res.status(404).json({ message: 'Dentist not found' });
      }

      res.json(dentist);
    } catch (error) {
      logger.error('Get dentist by email error', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /**
   * Get dentist's patients/appointments
   */
  getPatients: async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const { status, from, to } = req.query;

      const filters = {
        status: status as string | undefined,
        from: from as string | undefined,
        to: to as string | undefined,
      };

      const appointments = await dentistService.getPatients(email, filters);

      res.json(appointments);
    } catch (error) {
      logger.error('Get dentist patients error', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

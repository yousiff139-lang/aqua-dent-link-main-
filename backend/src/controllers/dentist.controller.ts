import { Request, Response } from 'express';
import { dentistService } from '../services/dentist.service.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { ErrorCode } from '../types/index.js';

const sendErrorResponse = (res: Response, error: unknown, context: string) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  logger.error(`${context} failed`, { error });
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
};

const parseStatusFilter = (value: unknown): string[] | undefined => {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value.map((status) => status.toString()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((status) => status.trim())
      .filter(Boolean);
  }

  return undefined;
};

const parseDateParam = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

export const dentistController = {
  /**
   * Login dentist with email
   */
  login: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Email is required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const result = await dentistService.login(email);

      if (!result) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid email or dentist not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      sendErrorResponse(res, error, 'Dentist login');
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
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Dentist not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: dentist,
      });
    } catch (error) {
      sendErrorResponse(res, error, 'Get dentist by email');
    }
  },

  /**
   * Get dentist's patients/appointments
   */
  getPatients: async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const statusParam = parseStatusFilter(req.query.status);
      const dateFrom = parseDateParam(req.query.date_from ?? req.query.from);
      const dateTo = parseDateParam(req.query.date_to ?? req.query.to);

      const appointments = await dentistService.getPatients(email, {
        status: statusParam,
        from: dateFrom,
        to: dateTo,
      });

      res.json({
        success: true,
        count: appointments.length,
        data: appointments,
      });
    } catch (error) {
      sendErrorResponse(res, error, 'Get dentist patients');
    }
  },
};

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatbotService } from '../services/chatbot.service.js';
import { logger } from '../config/logger.js';

// Validation schemas
const ChatMessageSchema = z.object({
  conversation_id: z.string().optional(),
  user_id: z.string().optional(),
  message: z.string().min(1).max(1000),
  session_token: z.string().optional(),
});

const GeneratePDFSchema = z.object({
  appointment_id: z.string().uuid(),
});

const AvailableSlotsSchema = z.object({
  dentist_id: z.string().uuid().optional(),
  specialization: z.string().optional(),
  date: z.string().optional(),
});

/**
 * Chatbot Controller
 * Handles chatbot conversation, PDF generation, and slot queries
 */
export class ChatbotController {
  /**
   * POST /api/chatbot/message
   * Process chatbot message and return response
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversation_id, user_id, message, session_token } = ChatMessageSchema.parse(req.body);
      
      // Determine user ID (authenticated user or guest session)
      const userId = user_id || session_token || req.user?.id;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID or session token required',
          },
        });
        return;
      }

      // Process message through chatbot service
      const response = await chatbotService.handleMessage({
        userId,
        conversationId: conversation_id,
        message,
      });

      logger.info('Chatbot message processed', {
        userId,
        conversationId: response.conversationId,
        state: response.state,
      });

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/chatbot/conversation/:id
   * Retrieve conversation history
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const conversation = await chatbotService.getConversation(id, userId);

      if (!conversation) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chatbot/generate-pdf
   * Generate PDF summary for appointment
   */
  async generatePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { appointment_id } = GeneratePDFSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const pdfUrl = await chatbotService.generateAppointmentPDF(appointment_id, userId);

      logger.info('PDF generated successfully', {
        appointmentId: appointment_id,
        userId,
        pdfUrl,
      });

      res.status(200).json({
        success: true,
        data: {
          pdf_url: pdfUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/chatbot/available-slots
   * Query available appointment slots
   */
  async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dentist_id, specialization, date } = AvailableSlotsSchema.parse(req.query);

      const slots = await chatbotService.getAvailableSlots({
        dentistId: dentist_id,
        specialization,
        date,
      });

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }
}

// Export singleton instance
export const chatbotController = new ChatbotController();

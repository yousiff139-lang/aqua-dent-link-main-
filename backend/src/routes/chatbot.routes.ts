import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * Chatbot Routes
 * 
 * POST   /api/chatbot/message             - Send message to chatbot (supports guest sessions)
 * GET    /api/chatbot/conversation/:id    - Get conversation history (authenticated)
 * POST   /api/chatbot/generate-pdf        - Generate PDF summary (authenticated)
 * GET    /api/chatbot/available-slots     - Query available slots (public)
 */

// Send message to chatbot (supports guest sessions with session_token)
router.post('/message', optionalAuth, (req, res, next) =>
  chatbotController.sendMessage(req, res, next)
);

// Get conversation history (authenticated users only)
router.get('/conversation/:id', (req, res, next) =>
  chatbotController.getConversation(req, res, next)
);

// Generate PDF summary (authenticated users only)
router.post('/generate-pdf', (req, res, next) =>
  chatbotController.generatePDF(req, res, next)
);

// Get available appointment slots (public endpoint)
router.get('/available-slots', (req, res, next) =>
  chatbotController.getAvailableSlots(req, res, next)
);

export { router as chatbotRouter };

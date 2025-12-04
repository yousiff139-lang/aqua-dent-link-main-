import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { chatbotService } from '../services/chatbot.service.js';
import { geminiService } from '../services/gemini.service.js';
import { AppError } from '../utils/errors.js';
import { knowledgeBaseService } from '../services/knowledge-base.service.js';
import { logger } from '../config/logger.js';


export const chatbotController = {
  /**
   * Start a new conversation
   */
  startConversation: asyncHandler(async (req: Request, res: Response) => {
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userName || !userEmail) {
      throw AppError.validation('userId, userName, and userEmail are required');
    }

    const conversation = await chatbotService.startConversation(userId, userName, userEmail);

    // Send greeting
    const greeting = await chatbotService.processMessage(conversation.id, 'start');

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: greeting,
      },
    });
  }),

  /**
   * Send a message in an existing conversation
   */
  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      throw AppError.validation('conversationId and message are required');
    }

    const response = await chatbotService.processMessage(conversationId, message);

    res.json({
      success: true,
      data: {
        message: response,
      },
    });
  }),

  /**
   * Get conversation state
   */
  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const conversation = chatbotService.getConversation(id);

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    res.json({
      success: true,
      data: conversation,
    });
  }),



  /**
   * Ask a quick question (stateless)
   * Prioritizes AI with internet search for accurate answers, uses local KB as fallback
   */
  askQuestion: asyncHandler(async (req: Request, res: Response) => {
    const { question, type = 'general' } = req.body;

    if (!question) {
      throw AppError.validation('question is required');
    }

    let answer: string;

    // PRIORITY: Use AI with internet search for accurate, current answers
    // Only use local knowledge base as a fallback if AI fails
    try {
      if (type === 'general') {
        // Use Gemini with internet search for general dentistry questions
        // This ensures we get the most current and accurate information
        answer = await geminiService.answerDentistryQuestion(question);
      } else {
        // Use Gemini for other question types
        answer = await geminiService.askQuestion(question);
      }

      logger.info('Successfully answered question using AI with internet search', {
        question: question.substring(0, 50)
      });

      return res.json({
        success: true,
        data: {
          question,
          answer,
        },
      });
    } catch (error: any) {
      logger.error('Error calling Gemini API, falling back to local knowledge base', {
        error: error.message,
        question: question.substring(0, 50)
      });

      // Fallback: try local knowledge base if AI fails
      // Fallback: try local knowledge base if AI fails
      const kbResult = knowledgeBaseService.searchByQuestion(question);
      if (kbResult && kbResult.confidence >= 0.6) {
        logger.info('Using local knowledge base as fallback', { question: question.substring(0, 50) });
        return res.json({
          success: true,
          data: {
            question,
            answer: kbResult.answer,
          },
        });
      }

      // If all else fails, provide a helpful error message
      throw AppError.internal('Unable to process question. Please try rephrasing or book an appointment for personalized advice.');
    }
  }),

  /**
   * Upload a document
   */
  uploadDocument: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      throw AppError.validation('No file uploaded');
    }

    if (!userId) {
      throw AppError.validation('userId is required');
    }

    const publicUrl = await chatbotService.uploadDocument(file, userId);

    res.json({
      success: true,
      data: {
        url: publicUrl,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      },
    });
  }),
};

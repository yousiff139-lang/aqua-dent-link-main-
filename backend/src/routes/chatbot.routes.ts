import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Start a new conversation
router.post('/start', chatbotController.startConversation);

// Send message in conversation
router.post('/message', chatbotController.sendMessage);

// Get conversation state
router.get('/conversation/:id', chatbotController.getConversation);

// Ask a quick question (stateless)
router.post('/ask', chatbotController.askQuestion);

// Upload document
router.post('/upload', upload.single('file'), chatbotController.uploadDocument);

export { router as chatbotRouter };

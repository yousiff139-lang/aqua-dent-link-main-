import { Router } from 'express';
import { profilesController } from '../controllers/profiles.controller.js';
import { authenticateRequest } from '../middleware/auth.js';

const router = Router();

// All profile routes require authentication
router.use(authenticateRequest);

// GET /api/profiles/me - Get current user profile
router.get('/me', profilesController.getCurrentUser);

// PUT /api/profiles/me - Update current user profile
router.put('/me', profilesController.updateCurrentUser);

// GET /api/profiles/dentists - List all dentists
router.get('/dentists', profilesController.listDentists);

// GET /api/profiles/dentists/:id - Get specific dentist
router.get('/dentists/:id', profilesController.getDentistById);

export { router as profilesRouter };

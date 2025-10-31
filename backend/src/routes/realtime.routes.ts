/**
 * Real-Time Synchronization Routes
 */

import { Router } from 'express';
import { realtimeController } from '../controllers/realtime.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';

const router = Router();

// Get active subscriptions (admin only)
router.get(
  '/subscriptions',
  authenticate,
  requireRole(['admin']),
  realtimeController.getSubscriptions.bind(realtimeController)
);

// Health check (public)
router.get('/health', realtimeController.healthCheck.bind(realtimeController));

export default router;


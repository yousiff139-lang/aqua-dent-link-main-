/**
 * Real-Time Synchronization Routes
 */

import { Router } from 'express';
import { realtimeController } from '../controllers/realtime.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Health check (public)
router.get('/health', (req, res) => realtimeController.healthCheck(req, res));

// Get active subscriptions (requires authentication)
router.get('/subscriptions', authenticate, (req, res) => realtimeController.getSubscriptions(req, res));

export default router;

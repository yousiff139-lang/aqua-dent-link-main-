/**
 * Real-Time Sync Routes
 * RESTful API endpoints for real-time synchronization
 */

import { Router } from 'express';
import {
  getSyncStatus,
  healthCheck,
  getSyncStats,
} from '../controllers/realtime-sync.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/authorization.js';

const router = Router();

// Health check (public)
router.get('/health', healthCheck);

// Sync status (authenticated)
router.get('/status', authenticate, getSyncStatus);

// Sync statistics (admin only)
router.get('/stats', authenticate, requireRole(['admin']), getSyncStats);

export default router;


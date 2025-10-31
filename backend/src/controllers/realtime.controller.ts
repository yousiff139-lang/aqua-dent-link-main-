/**
 * Real-Time Synchronization Controller
 * Provides RESTful API endpoints for real-time sync management
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { realtimeSyncService } from '../services/realtime-sync.service.js';
import { AppError } from '../utils/errors.js';

export class RealtimeController {
  /**
   * Get active subscriptions count (for monitoring)
   * GET /api/realtime/subscriptions
   */
  async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const count = realtimeSyncService.getActiveSubscriptionsCount();
      const channels = realtimeSyncService.getActiveSubscriptions();

      res.json({
        success: true,
        data: {
          count,
          channels,
        },
      });
    } catch (error) {
      logger.error('Failed to get subscriptions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get subscriptions',
      });
    }
  }

  /**
   * Health check for real-time service
   * GET /api/realtime/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const count = realtimeSyncService.getActiveSubscriptionsCount();

      res.json({
        success: true,
        status: 'healthy',
        activeSubscriptions: count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Real-time health check failed', { error });
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Real-time service is unavailable',
      });
    }
  }
}

export const realtimeController = new RealtimeController();


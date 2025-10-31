/**
 * Real-Time Sync Controller
 * Provides RESTful API endpoints for real-time synchronization
 * Handles sync status, subscriptions, and health checks
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { realtimeSyncService } from '../services/realtime-sync.service.js';
import { logger } from '../config/logger.js';
import { AuthenticatedRequest } from '../types/index.js';

/**
 * Get real-time sync status
 */
export const getSyncStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const activeSubscriptions = realtimeSyncService.getActiveSubscriptionsCount();
    const subscriptions = realtimeSyncService.getActiveSubscriptions();

    res.json({
      status: 'active',
      activeSubscriptions: activeSubscriptions,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        channelName: sub.channelName,
        active: sub.active,
      })),
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Health check for real-time sync service
 */
export const healthCheck = asyncHandler(
  async (req: Request, res: Response) => {
    const activeSubscriptions = realtimeSyncService.getActiveSubscriptionsCount();

    res.json({
      status: 'healthy',
      service: 'realtime-sync',
      activeSubscriptions,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Get sync statistics
 */
export const getSyncStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const subscriptions = realtimeSyncService.getActiveSubscriptions();
    
    // Group subscriptions by type
    const stats = {
      appointments: 0,
      availability: 0,
      global: 0,
      total: subscriptions.length,
    };

    subscriptions.forEach((sub) => {
      if (sub.channelName.includes('appointments')) {
        stats.appointments++;
      }
      if (sub.channelName.includes('availability')) {
        stats.availability++;
      }
      if (sub.channelName.includes('global')) {
        stats.global++;
      }
    });

    res.json({
      stats,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        channelName: sub.channelName,
        active: sub.active,
      })),
      timestamp: new Date().toISOString(),
    });
  }
);


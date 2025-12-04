import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env, corsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limiter.js';
import { supabase } from './config/supabase.js';
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
  userIdExtractorMiddleware
} from './middleware/request-logger.js';

// Create Express application
export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));

  // Special handling for Stripe webhook - capture raw body before JSON parsing
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.includes('/webhook')) {
      let data = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', () => {
        (req as any).rawBody = data;
        // Parse JSON manually for webhook endpoint
        try {
          if (data) {
            req.body = JSON.parse(data);
          }
        } catch (error) {
          logger.error('Failed to parse webhook body', { error });
        }
        next();
      });
    } else {
      next();
    }
  });

  // Standard JSON parsing for non-webhook endpoints
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.originalUrl.includes('/webhook')) {
      // Increase limit to 50MB to support base64 image uploads
      express.json({ limit: '50mb' })(req, res, next);
    } else {
      next();
    }
  });

  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Add request ID to all requests for tracing
  app.use(requestIdMiddleware);

  // Enhanced request/response logging middleware
  app.use(requestLoggerMiddleware);

  // Extract user ID from authenticated requests (after auth middleware runs)
  app.use(userIdExtractorMiddleware);

  // Rate limiting middleware (apply to all API routes)
  app.use(env.API_PREFIX, apiLimiter);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    // Check database connection
    let dbStatus = 'unknown';
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      dbStatus = error ? 'error' : 'ok';
    } catch (error) {
      dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'ok';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbStatus,
      },
    });
  });

  // API routes
  app.use(env.API_PREFIX, routes);

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

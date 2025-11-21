import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { testSupabaseConnection } from './config/supabase.js';

const startServer = async () => {
  try {
    // Test Supabase connection before starting server
    logger.info('Testing Supabase connection...');
    const isConnected = await testSupabaseConnection();
    
    if (!isConnected) {
      logger.warn('⚠️  Supabase connection test failed, but continuing startup...');
      logger.warn('Some features may not work until Supabase is properly configured.');
    }

    const app = createApp();
    
    // Handle port already in use
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server started successfully`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        apiPrefix: env.API_PREFIX,
        apiUrl: `http://localhost:${env.PORT}${env.API_PREFIX}`,
      });
      logger.info(`📡 Health check: http://localhost:${env.PORT}/health`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${env.PORT} is already in use. Please stop the process using this port or change PORT in .env`);
        process.exit(1);
      } else {
        logger.error('Server error', { error });
        process.exit(1);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    logger.error('Failed to start server', { 
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

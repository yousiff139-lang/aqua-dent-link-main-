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
    } else {
      // Test admin permissions if connection is successful
      const { testAdminPermissions, validateServiceRoleKey, testCreateUserCapability } = await import('./config/supabase.js');

      // Validate key format first
      const keyValidation = validateServiceRoleKey();
      if (!keyValidation.valid) {
        logger.error('❌ Service role key format is invalid!');
        logger.error(`   ${keyValidation.message}`);
        logger.error('   Dentist creation will fail. Please verify SUPABASE_SERVICE_ROLE_KEY in .env file.');
      }

      // Test admin permissions
      const hasAdminPerms = await testAdminPermissions();
      if (!hasAdminPerms) {
        logger.error('❌ Service role key does not have admin permissions!');
        logger.error('   Dentist creation will fail. Please verify SUPABASE_SERVICE_ROLE_KEY in .env file.');
        logger.error('   The service role key should start with "eyJ..." and be different from the anon key.');
      } else {
        // Test create user capability
        const createUserTest = await testCreateUserCapability();
        if (!createUserTest.success) {
          logger.error('❌ Service role key cannot create users!');
          logger.error(`   ${createUserTest.error}`);
          logger.error('   Dentist creation will fail. Please check your Supabase project settings.');
        }
      }
    }

    // Load knowledge base before starting server
    logger.info('Loading dental knowledge base...');
    try {
      const { knowledgeBaseService } = await import('./services/knowledge-base.service.js');
      await knowledgeBaseService.loadTrainingData();
      logger.info('✅ Knowledge base loaded successfully');
    } catch (error: any) {
      logger.error('❌ Failed to load knowledge base', {
        error: error.message,
      });
      logger.warn('⚠️  Chatbot will only use internet search for questions');
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

import winston from 'winston';
import { env } from './env.js';

// Define log format with enhanced error handling
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Capture stack traces
  winston.format.splat(),
  winston.format.json()
);

// Console format for development with better readability
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => key !== 'service');
    if (metaKeys.length > 0) {
      const metaObj: any = {};
      metaKeys.forEach(key => {
        metaObj[key] = meta[key];
      });
      msg += ` ${JSON.stringify(metaObj)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack}`;
    }
    
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'realtime-sync-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: env.NODE_ENV === 'development' ? consoleFormat : logFormat,
    }),
  ],
});

// Add file transports in production
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

export default logger;

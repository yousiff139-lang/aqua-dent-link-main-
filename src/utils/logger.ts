/**
 * Comprehensive logging utility for database operations and application events
 * Provides structured logging with timestamp, operation context, and sensitive data filtering
 */

// Sensitive field patterns to exclude from logs
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /auth/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?security/i,
  /stripe[_-]?payment[_-]?intent/i,
  /stripe[_-]?session/i,
];

// Payment-related fields to mask in production
const PAYMENT_FIELDS = [
  'stripe_session_id',
  'stripe_payment_intent_id',
  'payment_intent',
  'card_number',
  'card_last4',
];

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

/**
 * Database operation types for structured logging
 */
export enum DatabaseOperation {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPSERT = 'UPSERT',
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  operation?: DatabaseOperation | string;
  table?: string;
  message: string;
  details?: Record<string, any>;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enableConsoleLog: boolean;
  enableProductionLogs: boolean;
  logSuccessfulOperations: boolean;
  maskSensitiveData: boolean;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    
    this.config = {
      enableConsoleLog: true,
      enableProductionLogs: this.isProduction,
      logSuccessfulOperations: this.isDevelopment, // Only log successes in dev
      maskSensitiveData: this.isProduction, // Always mask in production
    };
  }

  /**
   * Checks if a field name matches sensitive patterns
   */
  private isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
  }

  /**
   * Checks if a field is payment-related
   */
  private isPaymentField(fieldName: string): boolean {
    return PAYMENT_FIELDS.includes(fieldName);
  }

  /**
   * Sanitizes an object by removing or masking sensitive data
   */
  private sanitizeData(data: any, depth = 0): any {
    // Prevent infinite recursion
    if (depth > 5) return '[Max depth reached]';
    
    if (data === null || data === undefined) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, depth + 1));
    }
    
    // Handle objects
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remove sensitive fields entirely
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
          continue;
        }
        
        // Mask payment fields in production
        if (this.config.maskSensitiveData && this.isPaymentField(key)) {
          if (typeof value === 'string' && value.length > 4) {
            sanitized[key] = `****${value.slice(-4)}`;
          } else {
            sanitized[key] = '[MASKED]';
          }
          continue;
        }
        
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value, depth + 1);
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Formats a log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
    ];
    
    if (entry.operation) {
      parts.push(`[${entry.operation}]`);
    }
    
    if (entry.table) {
      parts.push(`[${entry.table}]`);
    }
    
    parts.push(entry.message);
    
    if (entry.duration !== undefined) {
      parts.push(`(${entry.duration}ms)`);
    }
    
    return parts.join(' ');
  }

  /**
   * Outputs a log entry to the console
   */
  private outputLog(entry: LogEntry): void {
    if (!this.config.enableConsoleLog) return;
    
    const formattedMessage = this.formatLogEntry(entry);
    
    // Choose console method based on log level
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (entry.error) {
          console.error('Error details:', entry.error);
        }
        if (entry.details) {
          console.error('Additional details:', entry.details);
        }
        break;
        
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (entry.details) {
          console.warn('Details:', entry.details);
        }
        break;
        
      case LogLevel.SUCCESS:
        console.log(`✅ ${formattedMessage}`);
        if (entry.details && this.isDevelopment) {
          console.log('Details:', entry.details);
        }
        break;
        
      case LogLevel.INFO:
        console.info(formattedMessage);
        if (entry.details) {
          console.info('Details:', entry.details);
        }
        break;
        
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
          if (entry.details) {
            console.debug('Details:', entry.details);
          }
        }
        break;
    }
  }

  /**
   * Creates a base log entry with timestamp
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    options?: {
      operation?: DatabaseOperation | string;
      table?: string;
      details?: Record<string, any>;
      error?: any;
      duration?: number;
    }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    
    if (options?.operation) {
      entry.operation = options.operation;
    }
    
    if (options?.table) {
      entry.table = options.table;
    }
    
    if (options?.details) {
      entry.details = this.sanitizeData(options.details);
    }
    
    if (options?.error) {
      entry.error = {
        code: options.error.code,
        message: options.error.message || String(options.error),
        stack: this.isDevelopment ? options.error.stack : undefined,
      };
    }
    
    if (options?.duration !== undefined) {
      entry.duration = options.duration;
    }
    
    return entry;
  }

  /**
   * Logs a database query operation
   */
  public logDatabaseQuery(
    operation: DatabaseOperation,
    table: string,
    params?: Record<string, any>,
    duration?: number
  ): void {
    if (!this.config.logSuccessfulOperations) return;
    
    const entry = this.createLogEntry(
      LogLevel.DEBUG,
      `Database query executed`,
      {
        operation,
        table,
        details: params ? { params } : undefined,
        duration,
      }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a successful database operation
   */
  public logDatabaseSuccess(
    operation: DatabaseOperation,
    table: string,
    result?: any,
    duration?: number
  ): void {
    if (!this.config.logSuccessfulOperations) return;
    
    const entry = this.createLogEntry(
      LogLevel.SUCCESS,
      `Database operation successful`,
      {
        operation,
        table,
        details: result ? { result } : undefined,
        duration,
      }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a database error with full details
   */
  public logDatabaseError(
    operation: DatabaseOperation,
    table: string,
    error: any,
    params?: Record<string, any>
  ): void {
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      `Database operation failed`,
      {
        operation,
        table,
        details: params ? { params } : undefined,
        error,
      }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a general error
   */
  public error(message: string, error?: any, context?: Record<string, any>): void {
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      {
        details: context,
        error,
      }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a warning message
   */
  public warn(message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry(
      LogLevel.WARN,
      message,
      { details }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs an info message
   */
  public info(message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      message,
      { details }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a debug message (only in development)
   */
  public debug(message: string, details?: Record<string, any>): void {
    if (!this.isDevelopment) return;
    
    const entry = this.createLogEntry(
      LogLevel.DEBUG,
      message,
      { details }
    );
    
    this.outputLog(entry);
  }

  /**
   * Logs a success message
   */
  public success(message: string, details?: Record<string, any>): void {
    const entry = this.createLogEntry(
      LogLevel.SUCCESS,
      message,
      { details }
    );
    
    this.outputLog(entry);
  }

  /**
   * Creates a timer for measuring operation duration
   */
  public startTimer(): () => number {
    const startTime = performance.now();
    return () => Math.round(performance.now() - startTime);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Decorator for logging database operations
 * Usage: Wrap database calls with this function to automatically log them
 */
export async function withDatabaseLogging<T>(
  operation: DatabaseOperation,
  table: string,
  queryFn: () => Promise<T>,
  params?: Record<string, any>
): Promise<T> {
  const getElapsed = logger.startTimer();
  
  // Log the query attempt
  logger.logDatabaseQuery(operation, table, params);
  
  try {
    const result = await queryFn();
    const duration = getElapsed();
    
    // Log success
    logger.logDatabaseSuccess(operation, table, result, duration);
    
    return result;
  } catch (error) {
    const duration = getElapsed();
    
    // Log error with full details
    logger.logDatabaseError(operation, table, error, params);
    
    // Re-throw the error for handling by caller
    throw error;
  }
}

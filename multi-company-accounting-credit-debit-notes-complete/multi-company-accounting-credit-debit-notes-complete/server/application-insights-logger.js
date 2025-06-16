import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Application Insights configuration
const APPLICATION_INSIGHTS_ID = "e04a0cf1-8129-4bc2-8707-016ae726c876";

// Custom format for Application Insights
const applicationInsightsFormat = winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
  const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
  const formattedLevel = level.toUpperCase().padEnd(3);
  const logRequestId = requestId || uuidv4().substring(0, 8);
  
  let logMessage = `[${formattedTimestamp} ${formattedLevel}] [${logRequestId}] ${message}`;
  
  // Add exception details if present
  if (meta.error || meta.exception) {
    const error = meta.error || meta.exception;
    logMessage += `\n${error.stack || error.message || error}`;
  }
  
  return logMessage;
});

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    applicationInsightsFormat
  ),
  defaultMeta: {
    service: 'multi-company-accounting',
    applicationInsightsId: APPLICATION_INSIGHTS_ID
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        applicationInsightsFormat
      )
    }),
    
    // File transport for persistent logging
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: applicationInsightsFormat
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: applicationInsightsFormat
    })
  ]
});

// Middleware to add request ID to logs
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = uuidv4().substring(0, 8);
  res.locals.requestId = req.requestId;
  
  // Log incoming request
  logger.info(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
};

// Enhanced logging functions with Application Insights format
export const appLogger = {
  info: (message, meta = {}) => {
    logger.info(message, {
      ...meta,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  error: (message, error = null, meta = {}) => {
    logger.error(message, {
      ...meta,
      error: error,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, {
      ...meta,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, {
      ...meta,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  // API specific logging
  apiRequest: (req, message, meta = {}) => {
    logger.info(message, {
      ...meta,
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  apiError: (req, message, error, meta = {}) => {
    logger.error(message, {
      ...meta,
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      error: error,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  // Database operation logging
  dbOperation: (operation, table, meta = {}) => {
    logger.info(`Database ${operation} on ${table}`, {
      ...meta,
      operation,
      table,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  dbError: (operation, table, error, meta = {}) => {
    logger.error(`Database ${operation} failed on ${table}`, {
      ...meta,
      operation,
      table,
      error: error,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  },
  
  // Performance logging
  performance: (operation, duration, meta = {}) => {
    logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...meta,
      operation,
      duration,
      applicationInsightsId: APPLICATION_INSIGHTS_ID
    });
  }
};

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default appLogger;
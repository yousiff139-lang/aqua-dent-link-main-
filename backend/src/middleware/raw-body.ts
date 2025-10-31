import { Request, Response, NextFunction } from 'express';
import { json } from 'express';

/**
 * Middleware to capture raw body for Stripe webhook signature verification
 * This must be applied before the JSON body parser
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.includes('/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk) => {
      data += chunk;
    });
    
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
};

/**
 * Middleware to verify Stripe webhook signature
 * This should be applied to the webhook endpoint
 */
export const verifyStripeSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing Stripe signature',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // The actual verification is done in the payment service
  // This middleware just ensures the signature header is present
  next();
};

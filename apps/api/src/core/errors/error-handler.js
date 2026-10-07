import { AppError } from './app-error.js';
import { ErrorCode } from '@rwa/contracts';

export function errorHandler(err, req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || 'N/A';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        correlationId,
      },
    });
  }

  // Zod validation error handling
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Request payload validation failed',
        details: err.errors,
        correlationId,
      },
    });
  }

  // Chaincode / domain error mapping
  const msg = err?.message || '';
  if (
    msg.includes('Duplicate') ||
    msg.includes('already exists') ||
    msg.includes('already registered') ||
    msg.includes('already attached')
  ) {
    return res.status(409).json({
      success: false,
      error: {
        code: ErrorCode.CONFLICT || 'CONFLICT',
        message: msg,
        correlationId,
      },
    });
  }

  if (
    msg.includes('Unauthorized') ||
    msg.includes('Only Issuer') ||
    msg.includes('Only Administrator') ||
    msg.includes('Only Compliance') ||
    msg.includes('Segregation of duties')
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        message: msg,
        correlationId,
      },
    });
  }

  if (msg.includes('not found') || msg.includes('Not found')) {
    return res.status(404).json({
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        message: msg,
        correlationId,
      },
    });
  }

  if (
    msg.includes('Schema validation') ||
    msg.includes('Missing required field') ||
    msg.includes('deprecated') ||
    msg.includes('Missing mandatory evidence') ||
    msg.includes('blocked') ||
    msg.includes('Cannot') ||
    msg.includes('Invalid')
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: msg,
        correlationId,
      },
    });
  }

  console.error(`[UnhandledError] [${correlationId}]`, err);

  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected internal error occurred',
      correlationId,
    },
  });
}

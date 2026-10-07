import { AppError } from './app-error.js';
import { ErrorCode } from '@rwa/contracts';

export function errorHandler(err, req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || 'N/A';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
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
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Request payload validation failed',
        details: err.errors,
        correlationId,
      },
    });
  }

  console.error(`[UnhandledError] [${correlationId}]`, err);

  return res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected internal error occurred',
      correlationId,
    },
  });
}

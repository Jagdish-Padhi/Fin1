import { ErrorCode } from '@rwa/contracts';

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code || ErrorCode.BAD_REQUEST;
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new AppError(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Access denied for current role or organization') {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  static conflict(message = 'Resource conflict or state condition violated') {
    return new AppError(ErrorCode.CONFLICT, message, 409);
  }

  static preconditionFailed(message, details = null) {
    return new AppError(ErrorCode.PRECONDITION_FAILED, message, 412, details);
  }

  static internal(message = 'Internal server error') {
    return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500);
  }
}

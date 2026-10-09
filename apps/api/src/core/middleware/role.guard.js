import { AppError } from '../errors/app-error.js';
import { can, CAPABILITIES } from '@rwa/contracts';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('User identity not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Current role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

export function requireCapability(capability) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('User identity not authenticated'));
    }

    if (!can(req.user.role, capability)) {
      const allowedRoles = CAPABILITIES[capability] || [];
      return next(
        AppError.forbidden(
          `Current role '${req.user.role}' does not possess capability '${capability}'. Allowed roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

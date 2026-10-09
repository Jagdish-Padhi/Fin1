import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.access_token) {
    token = req.query.access_token;
  }

  if (!token) {
    return next(AppError.unauthorized('Missing or malformed authentication credentials'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token expired'));
    }
    return next(AppError.unauthorized('Invalid authentication token'));
  }
}

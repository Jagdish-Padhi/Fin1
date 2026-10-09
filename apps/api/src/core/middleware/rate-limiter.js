import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const isTest = config.nodeEnv === 'test';

export const globalRateLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_GLOBAL || '300', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    });

export const loginRateLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_LOGIN || '10', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 1 minute.',
      },
    });

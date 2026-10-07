const idempotencyCache = new Map();

/**
 * Ensures mutations with identical Idempotency-Key headers
 * return the recorded outcome without duplicate execution.
 */
export function idempotency(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const key = req.headers['idempotency-key'];
  if (!key) {
    // If not supplied, proceed normally
    return next();
  }

  if (idempotencyCache.has(key)) {
    const cached = idempotencyCache.get(key);
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json output to cache
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    idempotencyCache.set(key, {
      status: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    return originalJson(body);
  };

  next();
}

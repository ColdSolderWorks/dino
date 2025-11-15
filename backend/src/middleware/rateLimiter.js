const buckets = new Map();

function rateLimiter({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  return (req, res, next) => {
    const key = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'local';
    const entry = buckets.get(key) || { count: 0, expiresAt: Date.now() + windowMs };
    if (Date.now() > entry.expiresAt) {
      entry.count = 0;
      entry.expiresAt = Date.now() + windowMs;
    }
    entry.count += 1;
    buckets.set(key, entry);
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    return next();
  };
}

module.exports = rateLimiter;

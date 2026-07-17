/**
 * Simple in-memory cache middleware for API responses
 * Improves page load speed by caching frequently accessed data
 */

const cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minute default

/**
 * Create cache middleware
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @param {Object} options - Additional options
 * @param {boolean} options.allowBypass - Allow bypassing cache with ?fresh=true query param
 */
function createCacheMiddleware(ttl = DEFAULT_TTL, keyGenerator = null, options = {}) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Allow bypassing cache with ?fresh=true or ?nocache=true
    const bypassCache = req.query.fresh === 'true' || req.query.nocache === 'true';
    if (bypassCache && options.allowBypass !== false) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `${req.originalUrl}:${(req.user?.admin_id || req.user?._id) || 'anonymous'}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      // Add cache header to indicate cached response
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Cache successful responses (only if not bypassed)
      if (res.statusCode === 200 && !bypassCache) {
        cache.set(cacheKey, {
          data,
          expires: Date.now() + ttl
        });
        res.setHeader('X-Cache', 'MISS');
      } else if (res.statusCode === 200) {
        res.setHeader('X-Cache', 'BYPASS');
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Clear cache for a specific key pattern
 */
function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear expired cache entries (cleanup)
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now >= value.expires) {
      cache.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

module.exports = {
  createCacheMiddleware,
  clearCache,
  cleanupCache
};


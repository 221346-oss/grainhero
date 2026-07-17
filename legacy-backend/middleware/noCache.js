/**
 * No-Cache Middleware
 * 
 * Ensures critical real-time endpoints are NEVER cached.
 * Use this for:
 * - Actuator controls
 * - Live sensor readings
 * - Real-time alerts
 * - AI predictions (when they need to be fresh)
 */

function noCache(req, res, next) {
  // Set headers to prevent any caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Cache', 'DISABLED');
  next();
}

module.exports = noCache;



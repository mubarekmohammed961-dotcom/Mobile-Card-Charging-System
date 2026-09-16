// ============================================================
// MCCS - Session Management Middleware
// NFR-002: Secure session handling with activity tracking
// ============================================================

const db = require("../config/db");

/**
 * Track user session activity
 * Updates last_activity timestamp for active sessions
 */
const trackActivity = async (req, res, next) => {
  if (req.user && req.user.id) {
    req.session.lastActivity = new Date().toISOString();
    req.session.userRole = req.user.role;
    req.session.userId = req.user.id;
  }
  next();
};

/**
 * Check session expiry
 * Automatically logout users with expired sessions
 */
const checkSessionExpiry = (req, res, next) => {
  if (req.session && req.session.lastActivity) {
    const lastActivity = new Date(req.session.lastActivity);
    const now = new Date();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (now - lastActivity > sessionTimeout) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
  }
  next();
};

/**
 * Store user session in database
 * For session tracking and management
 */
const storeSession = async (userId, sessionId, ipAddress, userAgent) => {
  try {
    await db.query(
      `INSERT INTO user_sessions 
       (user_id, session_id, ip_address, user_agent, created_at, last_activity)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       last_activity = NOW()`,
      [userId, sessionId, ipAddress, userAgent]
    );
  } catch (error) {
    console.error("Store session error:", error.message);
  }
};

/**
 * Destroy user session from database
 */
const destroySession = async (sessionId) => {
  try {
    await db.query(
      `DELETE FROM user_sessions WHERE session_id = ?`,
      [sessionId]
    );
  } catch (error) {
    console.error("Destroy session error:", error.message);
  }
};

/**
 * Get active sessions for a user
 */
const getActiveSessions = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        session_id,
        ip_address,
        user_agent,
        created_at,
        last_activity
       FROM user_sessions
       WHERE user_id = ?
       ORDER BY last_activity DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error("Get active sessions error:", error.message);
    return [];
  }
};

/**
 * Clean up expired sessions
 * Run this periodically via cron job
 */
const cleanupExpiredSessions = async () => {
  try {
    const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const [result] = await db.query(
      `DELETE FROM user_sessions WHERE last_activity < ?`,
      [expiryTime]
    );

    console.log(`[Session Cleanup] Removed ${result.affectedRows} expired sessions`);
    return result.affectedRows;
  } catch (error) {
    console.error("Cleanup sessions error:", error.message);
    return 0;
  }
};

/**
 * Middleware to set security headers for cookies
 */
const setCookieHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  next();
};

/**
 * Prevent session fixation attacks
 * Regenerate session ID after login
 */
const regenerateSession = (req) => {
  return new Promise((resolve, reject) => {
    const oldSessionData = { ...req.session };
    
    req.session.regenerate((err) => {
      if (err) {
        return reject(err);
      }
      
      // Restore session data
      Object.assign(req.session, oldSessionData);
      resolve();
    });
  });
};

/**
 * Session validation middleware
 * Ensures session is valid and not tampered
 */
const validateSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    // Session exists and has user ID
    if (req.user && req.user.id !== req.session.userId) {
      // Mismatch between JWT user and session user
      return res.status(401).json({
        success: false,
        message: "Session validation failed. Please login again.",
      });
    }
  }
  next();
};

module.exports = {
  trackActivity,
  checkSessionExpiry,
  storeSession,
  destroySession,
  getActiveSessions,
  cleanupExpiredSessions,
  setCookieHeaders,
  regenerateSession,
  validateSession,
};

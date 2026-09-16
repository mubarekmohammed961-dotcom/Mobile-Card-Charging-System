const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const { storeSession, regenerateSession } = require("../middleware/sessionMiddleware");
const db = require("../config/db");
const { sendPasswordResetEmail } = require("../services/emailService");
const { validateEmail, validatePassword } = require("../utils/validators");

const register = async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    // SRS Section 16: Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.error,
      });
    }

    // SRS-compliant password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.error,
      });
    }

    // Check if email already exists (SRS Section 16: "unique across system")
    const existingUser = await User.findByEmail(emailValidation.sanitized);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists (must be unique per SRS Section 16)",
      });
    }

    // Default role
    const userRole = role || "STORE_OFFICER";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = await User.create({
      full_name,
      email: emailValidation.sanitized,
      password: hashedPassword,
      role: userRole,
      phone,
      status: "ACTIVE",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user_id: userId,
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

const login = async (req, res) => {
  console.log("=== LOGIN REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("IP:", req.ip);
  
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log("1. Checking login attempts lockout...");
    // CHECK: Account locked due to failed attempts?
    let isLocked = false;
    try {
      isLocked = await checkLoginAttemptsLockout(email);
    } catch (lockoutError) {
      console.log("Login attempts check skipped (table missing or error):", lockoutError.message);
    }
    console.log("2. Lockout check done:", isLocked);
    
    if (isLocked) {
      // Log failed attempt
      try {
        await logLoginAttempt(email, ipAddress, userAgent, false, "Account temporarily locked");
      } catch (e) { /* ignore */ }
      
      return res.status(429).json({
        success: false,
        message: "Too many failed login attempts. Your account is locked for 30 minutes. Please try again later or use 'Forgot Password'.",
      });
    }

    console.log("3. Finding user by email...");
    // Find user
    const user = await User.findByEmail(email);
    console.log("4. User found:", user ? `${user.email} (${user.role})` : "NOT FOUND");

    if (!user) {
      // Log failed attempt - user not found
      try {
        await logLoginAttempt(email, ipAddress, userAgent, false, "Invalid email");
      } catch (e) { /* ignore */ }
      
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      // Log failed attempt - inactive account
      try {
        await logLoginAttempt(email, ipAddress, userAgent, false, "Account inactive");
      } catch (e) { /* ignore */ }
      
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    console.log("5. Comparing password...");
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("6. Password match:", passwordMatch);

    if (!passwordMatch) {
      // Log failed attempt - wrong password
      try {
        await logLoginAttempt(email, ipAddress, userAgent, false, "Invalid password");
      } catch (e) { /* ignore */ }
      
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("7. SUCCESS: Clearing login attempts...");
    // SUCCESS: Clear any previous failed attempts for this email
    // await clearLoginAttempts(email);  // DISABLED
    console.log("8. Creating JWT token...");

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    console.log("9. JWT created");

    // Regenerate session ID to prevent session fixation attacks
    // TEMPORARILY DISABLED - MySQL hanging
    // await regenerateSession(req);
    console.log("Skipping regenerateSession");

    // Store session data
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userEmail = user.email;
    req.session.lastActivity = new Date().toISOString();

    // Store session in database for tracking
    // TEMPORARILY DISABLED - MySQL hanging
    // await storeSession(
    //   user.id,
    //   req.sessionID,
    //   req.ip || req.connection.remoteAddress,
    //   req.headers['user-agent']
    // );
    console.log("Skipping storeSession");

    // Log successful login attempt
    // await logLoginAttempt(email, ipAddress, userAgent, true, null);
    console.log("Skipping logLoginAttempt");

    // Set secure cookie with token (optional - for cookie-based auth)
    res.cookie('mccs_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log("10. Cookie set");

    // NFR-004: Log LOGIN action (SRS Section 20 - Audit Trail)
    console.log("11. Logging audit...");
    try {
      const { writeAuditLog } = require("../utils/auditLogger");
      await writeAuditLog({
        userId: user.id,
        action: 'LOGIN',
        details: { 
          message: `User logged in: ${user.email}`,
          role: user.role,
          session_id: req.sessionID,
          user_agent: req.headers['user-agent']
        },
        ip: ipAddress
      });
      console.log("Audit log written successfully");
    } catch (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail login if audit fails
    }
    
    console.log("12. Sending response...");

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionID;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // NFR-004: Log LOGOUT action BEFORE destroying session (SRS Section 20)
    if (userId) {
      try {
        const { writeAuditLog } = require("../utils/auditLogger");
        await writeAuditLog({
          userId,
          action: 'LOGOUT',
          details: { 
            message: `User logged out`,
            session_id: sessionId
          },
          ip: ipAddress
        });
      } catch (auditError) {
        console.error("Audit log error:", auditError);
        // Continue with logout even if audit fails
      }
    }

    // Clear cookie
    res.clearCookie('mccs_token');
    res.clearCookie('mccs.sid');

    // Destroy session from database
    if (sessionId) {
      const { destroySession } = require("../middleware/sessionMiddleware");
      await destroySession(sessionId);
    }

    // Destroy express session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({
          success: false,
          message: "Logout failed",
        });
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { getActiveSessions: fetchSessions } = require("../middleware/sessionMiddleware");
    const sessions = await fetchSessions(userId);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        session_id: s.session_id,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        created_at: s.created_at,
        last_activity: s.last_activity,
        is_current: s.session_id === req.sessionID,
      })),
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sessions",
    });
  }
};

// ============================================================
// HELPER: Check if account is locked due to failed attempts
// ============================================================
async function checkLoginAttemptsLockout(email) {
  try {
    const lockoutMinutes = 30;
    const maxAttempts = 3;
    
    // Count failed attempts in last 30 minutes
    const [rows] = await db.query(
      `SELECT COUNT(*) as failed_count 
       FROM login_attempts 
       WHERE email = ? 
         AND success = 0 
         AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [email, lockoutMinutes]
    );
    
    return rows[0].failed_count >= maxAttempts;
  } catch (error) {
    console.error("Check lockout error:", error);
    return false; // Don't lock out on error
  }
}

// ============================================================
// HELPER: Log login attempt
// ============================================================
async function logLoginAttempt(email, ipAddress, userAgent, success, failureReason) {
  try {
    await db.query(
      `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, ipAddress, userAgent, success ? 1 : 0, failureReason]
    );
  } catch (error) {
    console.error("Log login attempt error:", error);
  }
}

// ============================================================
// HELPER: Clear failed login attempts after successful login
// ============================================================
async function clearLoginAttempts(email) {
  try {
    await db.query(
      `DELETE FROM login_attempts 
       WHERE email = ? AND success = 0`,
      [email]
    );
  } catch (error) {
    console.error("Clear login attempts error:", error);
  }
}

// ============================================================
// FORGOT PASSWORD - Send reset email
// ============================================================
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);

    // SECURITY: Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
      return res.json({
        success: true,
        message: "If your email exists in our system, you will receive a password reset link shortly.",
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store reset token in database
    await db.query(
      `INSERT INTO password_resets (user_id, email, token, expires_at, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, email, hashedToken, expiresAt, ipAddress]
    );

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, user.full_name, resetUrl);

    // Log audit
    try {
      await db.query(
        "INSERT INTO audit_logs (user_id, action, details, ip) VALUES (?, 'PASSWORD_RESET_REQUESTED', ?, ?)",
        [user.id, JSON.stringify({ message: `Password reset requested for ${email}` }), ipAddress],
      );
    } catch (_) {}

    res.json({
      success: true,
      message: "If your email exists in our system, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
}

// ============================================================
// RESET PASSWORD - Verify token and update password
// ============================================================
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const [resetRecords] = await db.query(
      `SELECT * FROM password_resets 
       WHERE token = ? 
         AND used = 0 
         AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [hashedToken]
    );

    if (!resetRecords || resetRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const resetRecord = resetRecords[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, resetRecord.user_id]
    );

    // Mark token as used
    await db.query(
      `UPDATE password_resets 
       SET used = 1, used_at = NOW() 
       WHERE id = ?`,
      [resetRecord.id]
    );

    // Clear any failed login attempts
    await clearLoginAttempts(resetRecord.email);

    // Log audit
    try {
      await db.query(
        "INSERT INTO audit_logs (user_id, action, details, ip) VALUES (?, 'PASSWORD_RESET_COMPLETED', ?, ?)",
        [resetRecord.user_id, JSON.stringify({ message: `Password reset completed for ${resetRecord.email}` }), ipAddress],
      );
    } catch (_) {}

    res.json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
}


module.exports = { register, login, logout, getActiveSessions, forgotPassword, resetPassword };

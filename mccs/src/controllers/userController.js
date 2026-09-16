const bcrypt = require("bcrypt");
const db = require("../config/db");
const { writeAuditLog } = require("../utils/auditLogger");
const { 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateRole,
  validateFullName,
  VALID_ROLES 
} = require("../utils/validators");

// ============================================================
// GET /api/users
// List all users (admin only)
// ============================================================
const getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id, full_name, email, role, phone, status, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    return res.json({ success: true, count: rows.length, users: rows });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve users", error: error.message });
  }
};

// ============================================================
// GET /api/users/:id
// ============================================================
const getUserById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, full_name, email, role, phone, status, created_at, updated_at FROM users WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to retrieve user", error: error.message });
  }
};

// ============================================================
// POST /api/users
// Create user (Super Admin / System Admin only)
// SRS Section 16: Email validation, unique check
// ============================================================
const createUser = async (req, res) => {
  try {
    const { full_name, email, password, role, phone, status } = req.body;

    // Validate full name
    const nameValidation = validateFullName(full_name);
    if (!nameValidation.valid) {
      return res.status(400).json({ success: false, message: nameValidation.error });
    }

    // SRS Section 16: Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, message: emailValidation.error });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.error });
    }

    // Validate role
    const roleValidation = validateRole(role, false);
    if (!roleValidation.valid) {
      return res.status(400).json({ success: false, message: roleValidation.error });
    }

    // Validate phone (optional)
    const phoneValidation = validatePhone(phone, false);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, message: phoneValidation.error });
    }

    // SRS Section 16: Check duplicate email (unique across system)
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [emailValidation.sanitized]);
    if (existing.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Email already exists (must be unique per SRS Section 16)" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        nameValidation.sanitized,
        emailValidation.sanitized,
        hashedPassword,
        roleValidation.sanitized || "STORE_OFFICER",
        phoneValidation.sanitized || null,
        status || "ACTIVE",
      ],
    );

    await writeAuditLog({
      userId: req.user?.id,
      action: "UPDATE",
      cardId: null,
      details: { 
        message: `User created: ${emailValidation.sanitized} with role ${roleValidation.sanitized || "STORE_OFFICER"}` 
      },
      ip: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: result.insertId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        role: role || "STORE_OFFICER",
        phone: phone?.trim() || null,
        status: status || "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to create user", error: error.message });
  }
};

// ============================================================
// PUT /api/users/:id
// Update user profile / role / status
// ============================================================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, phone, status } = req.body;

    // Prevent non-super-admin from changing role to SUPER_ADMIN
    if (role === "SUPER_ADMIN" && req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Only SUPER_ADMIN can assign SUPER_ADMIN role" });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    await db.query(
      `UPDATE users SET
        full_name  = COALESCE(?, full_name),
        email      = COALESCE(?, email),
        role       = COALESCE(?, role),
        phone      = COALESCE(?, phone),
        status     = COALESCE(?, status)
       WHERE id = ?`,
      [
        full_name?.trim() || null,
        email?.trim().toLowerCase() || null,
        role || null,
        phone?.trim() || null,
        status || null,
        id,
      ],
    );

    await writeAuditLog({
      userId: req.user?.id,
      action: "UPDATE",
      cardId: null,
      details: { message: `User #${id} updated by ${req.user?.email}` },
      ip: req.ip || null,
    });

    const [updated] = await db.query(
      "SELECT id, full_name, email, role, phone, status, created_at, updated_at FROM users WHERE id = ?",
      [id],
    );
    return res.json({ success: true, message: "User updated successfully", user: updated[0] });
  } catch (error) {
    console.error("Update user error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email already taken" });
    }
    return res.status(500).json({ success: false, message: "Failed to update user", error: error.message });
  }
};

// ============================================================
// PATCH /api/users/:id/password
// Reset/change user password (admin) or own password
// ============================================================
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password, current_password } = req.body;
    const requesterId = req.user?.id;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const [rows] = await db.query("SELECT id, password, role FROM users WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    const targetUser = rows[0];

    // If changing own password, require current password
    if (Number(requesterId) === Number(id)) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: "Current password is required to change your own password" });
      }
      const match = await bcrypt.compare(current_password, targetUser.password);
      if (!match) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }
    }

    // Only SUPER_ADMIN / SYSTEM_ADMIN can reset other users' passwords
    if (Number(requesterId) !== Number(id)) {
      const allowedAdminRoles = ["SUPER_ADMIN", "SYSTEM_ADMIN"];
      if (!allowedAdminRoles.includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admins can reset other users passwords" });
      }
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, id]);

    await writeAuditLog({
      userId: requesterId,
      action: "UPDATE",
      cardId: null,
      details: { message: `Password changed for user #${id}` },
      ip: req.ip || null,
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Failed to change password", error: error.message });
  }
};

// ============================================================
// PATCH /api/users/:id/status
// Activate / Deactivate user
// ============================================================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be ACTIVE or INACTIVE" });
    }

    // Prevent deactivating self
    if (Number(id) === Number(req.user?.id) && status === "INACTIVE") {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    await db.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);

    await writeAuditLog({
      userId: req.user?.id,
      action: "UPDATE",
      cardId: null,
      details: { message: `User #${id} ${status === "ACTIVE" ? "activated" : "deactivated"}` },
      ip: req.ip || null,
    });

    return res.json({ success: true, message: `User ${status === "ACTIVE" ? "activated" : "deactivated"} successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

// ============================================================
// GET /api/users/me
// Get current logged-in user profile
// ============================================================
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, full_name, email, role, phone, status, created_at FROM users WHERE id = ?",
      [req.user?.id],
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get profile", error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  toggleUserStatus,
  getMe,
};

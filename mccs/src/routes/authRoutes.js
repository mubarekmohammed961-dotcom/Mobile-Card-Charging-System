const express = require("express");
const { register, login, logout, getActiveSessions, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login",    login);
router.post("/logout",   protect, logout);
router.get("/sessions",  protect, getActiveSessions);  // Get user's active sessions
router.post("/forgot-password", forgotPassword);       // Request password reset
router.post("/reset-password",  resetPassword);        // Reset password with token

module.exports = router;

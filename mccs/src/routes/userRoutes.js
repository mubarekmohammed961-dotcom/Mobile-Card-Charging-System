const express = require("express");
const {
  getUsers, getUserById, createUser,
  updateUser, changePassword, toggleUserStatus, getMe,
} = require("../controllers/userController");
const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// GET /api/users/me  — current user profile (any authenticated user)
router.get("/me", protect, getMe);

// GET /api/users — list all users (admins only)
router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  getUsers,
);

// GET /api/users/:id
router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  getUserById,
);

// POST /api/users — create user
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  createUser,
);

// PUT /api/users/:id — update profile/role/status
router.put(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  updateUser,
);

// PATCH /api/users/:id/password — change/reset password
router.patch(
  "/:id/password",
  protect,
  changePassword,
);

// PATCH /api/users/:id/status — activate/deactivate
router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  toggleUserStatus,
);

module.exports = router;

const express = require("express");

const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} = require("../controllers/departmentController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ============================================================
// GET /api/departments
// ============================================================
router.get(
  "/",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "STORE_OFFICER",
    "DEPARTMENT_HEAD",
    "AUDITOR",
  ),
  getDepartments,
);

// ============================================================
// GET /api/departments/:id
// ============================================================
router.get(
  "/:id",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "STORE_OFFICER",
    "DEPARTMENT_HEAD",
    "AUDITOR",
  ),
  getDepartmentById,
);

// ============================================================
// POST /api/departments
// ============================================================
router.post(
  "/",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
  ),
  createDepartment,
);

// ============================================================
// PUT /api/departments/:id
// ============================================================
router.put(
  "/:id",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
  ),
  updateDepartment,
);

module.exports = router;
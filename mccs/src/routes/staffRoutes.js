const express = require("express");
const multer  = require("multer");

const {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  bulkUploadStaff,
} = require("../controllers/staffController");

const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const upload = multer({
  dest: "src/uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) cb(null, true);
    else cb(new Error("Only CSV files allowed"));
  },
});

const router = express.Router();

const admins = ["SUPER_ADMIN","SYSTEM_ADMIN"];
const readers = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"];

// GET /api/staff
router.get("/",              protect, authorize(...readers), getStaff);

// POST /api/staff/bulk-upload (FR-012) — must be before /:id
router.post("/bulk-upload",  protect, authorize(...admins), upload.single("file"), bulkUploadStaff);

// POST /api/staff
router.post("/",             protect, authorize(...admins), createStaff);

// GET /api/staff/:id
router.get("/:id",           protect, authorize(...readers), getStaffById);

// GET /api/staff/:id/eligibility  (Section 15 API Checklist)
router.get("/:id/eligibility", protect, authorize(...readers), async (req, res) => {
  try {
    const db = require("../config/db");
    const [rows] = await db.query(
      `SELECT id, staff_id, card_type, monthly_quota, is_active, created_at
       FROM eligibility_rules WHERE staff_id = ? ORDER BY card_type`,
      [req.params.id],
    );
    return res.json({ success: true, count: rows.length, eligibility: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed", error: e.message });
  }
});

// PUT /api/staff/:id
router.put("/:id",           protect, authorize(...admins), updateStaff);

module.exports = router;

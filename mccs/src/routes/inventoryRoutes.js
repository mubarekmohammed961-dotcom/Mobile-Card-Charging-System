const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  dest: "src/uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const {
  getCards,
  getCardById,
  uploadCards,
  addCard,
  getInventoryStats,
  updateCardStatus,
} = require("../controllers/inventoryController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// List inventory cards
router.get(
  "/cards",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER", "AUDITOR"),
  getCards,
);

// Inventory stats
router.get(
  "/stats",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER", "AUDITOR"),
  getInventoryStats,
);

// Get one card
router.get(
  "/cards/:id",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER", "AUDITOR"),
  getCardById,
);

// Add single card manually (FR-004)
router.post(
  "/cards",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER"),
  (req, res, next) => {
    console.log("POST /api/inventory/cards route hit!");
    console.log("User from middleware:", req.user);
    next();
  },
  addCard,
);

// PATCH card status manually (FR-035)
router.patch(
  "/cards/:id/status",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER"),
  updateCardStatus,
);

// Upload CSV
router.post(
  "/upload",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER"),
  upload.single("file"),
  uploadCards,
);

module.exports = router;

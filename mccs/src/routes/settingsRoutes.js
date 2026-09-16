const express = require("express");
const { getSettings, updateSettings, updateSetting, testEmail, getHealth } = require("../controllers/settingsController");
const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

const admins = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

router.get("/health",        protect, authorize(...admins), getHealth);
router.get("/",              protect, authorize(...admins), getSettings);
router.put("/",              protect, authorize(...admins), updateSettings);
router.put("/:key",          protect, authorize(...admins), updateSetting);
router.post("/test-email",   protect, authorize(...admins), testEmail);

module.exports = router;

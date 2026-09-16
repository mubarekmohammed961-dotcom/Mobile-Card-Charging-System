const express = require("express");
const { confirmDelivery } = require("../controllers/confirmationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/confirmations — any authenticated user can confirm (STAFF confirms own card)
// Section 15: POST /api/deliveries/confirm
router.post("/", protect, confirmDelivery);

module.exports = router;

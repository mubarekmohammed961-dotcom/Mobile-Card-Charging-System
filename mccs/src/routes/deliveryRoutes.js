const express = require("express");

const {
  createDelivery,
  sendDelivery,
  getDeliveries,
  resendDelivery,
} = require("../controllers/deliveryController");

const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

const actors = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"];

// POST /api/deliveries — Create delivery
router.post("/",              protect, authorize(...actors), createDelivery);

// POST /api/deliveries/:id/send — Send delivery (marks SENT + emails PIN)
router.post("/:id/send",      protect, authorize(...actors), sendDelivery);

// POST /api/deliveries/:id/resend — Resend with new token (FR-028 manual resend)
router.post("/:id/resend",    protect, authorize(...actors), resendDelivery);

// GET /api/deliveries — List all deliveries
router.get("/",               protect, authorize(...actors,"AUDITOR"), getDeliveries);

module.exports = router;

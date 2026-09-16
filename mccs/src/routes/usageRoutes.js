const express = require("express");
const { markCardAsUsed, getUsageLogs, getAllocatedCards } = require("../controllers/usageController");
const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All roles that can access usage (STAFF can mark own cards & view own history)
const allRoles = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"];
const actors   = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF"];

// GET /api/usage/allocated-cards — staff can see their own allocated cards
router.get("/allocated-cards", protect, authorize(...allRoles), getAllocatedCards);

// POST /api/usage — staff can mark their own card as used (FR-034)
router.post("/",               protect, authorize(...actors),  markCardAsUsed);

// GET /api/usage — staff can view their own usage history
router.get("/",                protect, authorize(...allRoles), getUsageLogs);

module.exports = router;

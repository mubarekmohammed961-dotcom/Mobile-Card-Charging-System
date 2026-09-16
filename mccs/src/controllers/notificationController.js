const db = require("../config/db");

// ============================================================
// GET /api/notifications
// Get notifications for current user (Section 18)
// ============================================================
const getNotifications = async (req, res) => {
  try {
    const userId  = req.user?.id;
    const limit   = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const unreadOnly = req.query.unread === "true";

    let sql = `
      SELECT id, type, title, message, is_read, link, created_at
      FROM notifications
      WHERE user_id = ?
      ${unreadOnly ? "AND is_read = 0" : ""}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [rows] = await db.query(sql, [userId, limit]);

    const [countRows] = await db.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0",
      [userId],
    );

    return res.json({
      success:       true,
      count:         rows.length,
      unread_count:  Number(countRows[0]?.unread || 0),
      notifications: rows,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: "Failed to load notifications", error: error.message });
  }
};

// ============================================================
// PATCH /api/notifications/:id/read
// Mark one notification as read
// ============================================================
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [id, userId],
    );

    return res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
};

// ============================================================
// PATCH /api/notifications/read-all
// Mark all notifications as read
// ============================================================
const markAllRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
};

// ============================================================
// Helper: create a notification (used internally)
// ============================================================
const createNotification = async ({ userId, type, title, message, link = null }) => {
  try {
    await db.query(
      "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
      [userId, type, title, message, link],
    );
  } catch (err) {
    console.error("Create notification error:", err.message);
  }
};

module.exports = { getNotifications, markRead, markAllRead, createNotification };

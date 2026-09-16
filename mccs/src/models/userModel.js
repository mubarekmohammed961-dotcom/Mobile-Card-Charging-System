const db = require("../config/db");

const User = {
  async findByEmail(email) {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT 
                id,
                full_name,
                email,
                role,
                phone,
                status,
                created_at,
                updated_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
      [id],
    );

    return rows[0];
  },

  async create(user) {
    const [result] = await db.query(
      `INSERT INTO users
                (full_name, email, password, role, phone, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.full_name,
        user.email,
        user.password,
        user.role,
        user.phone || null,
        user.status || "ACTIVE",
      ],
    );

    return result.insertId;
  },
};

module.exports = User;

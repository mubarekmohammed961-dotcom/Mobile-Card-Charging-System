const db = require("../config/db");

const writeAuditLog = async ({
  userId,
  action,
  cardId = null,
  details = null,
  ip = null,
  connection = null,
}) => {
  const database = connection || db;

  await database.query(
    `
    INSERT INTO audit_logs
    (
      user_id,
      action,
      card_id,
      details,
      ip
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      userId,
      action,
      cardId,
      details
        ? typeof details === "string"
          ? details
          : JSON.stringify(details)
        : null,
      ip,
    ],
  );
};

module.exports = {
  writeAuditLog,
};

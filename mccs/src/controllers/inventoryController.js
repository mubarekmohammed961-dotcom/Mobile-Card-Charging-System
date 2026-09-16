const db = require("../config/db");
const fs = require("fs");
const csv = require("csv-parser");
const crypto = require("crypto");
const { encrypt } = require("../utils/encryption");
const { writeAuditLog } = require("../utils/auditLogger");
// ============================================================
// GET /api/inventory/cards
// List cards with optional filters
// ============================================================
const getCards = async (req, res) => {
  try {
    const { status, type, category, package_type, provider } = req.query;

    let sql = `
      SELECT
        id,
        card_uuid,
        provider,
        type,
        value,
        expiry_date,
        batch_number,
        status,
        created_at
      FROM cards
      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (provider) {
      sql += " AND provider = ?";
      params.push(provider);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      count: rows.length,
      cards: rows,
    });
  } catch (error) {
    console.error("Get cards error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cards",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/inventory/cards/:id
// Get one card by ID
// ============================================================
const getCardById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        id,
        card_uuid,
        provider,
        type,
        value,
        expiry_date,
        batch_number,
        status,
        created_at
      FROM cards
      WHERE id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    return res.json({
      success: true,
      card: rows[0],
    });
  } catch (error) {
    console.error("Get card error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve card",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/inventory/upload
// Import cards from CSV
// ============================================================
const uploadCards = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // Check uploaded file
    // ----------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const cards = [];

    // ----------------------------------------------------------
    // Read CSV file
    // ----------------------------------------------------------
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        cards.push(row);
      })
      .on("end", async () => {
        try {
          // ----------------------------------------------------
          // Check empty CSV
          // ----------------------------------------------------
          if (cards.length === 0) {
            fs.unlink(req.file.path, () => {});

            return res.status(400).json({
              success: false,
              message: "CSV file is empty",
            });
          }

          let imported = 0;
          let failed = 0;

          const errors = [];

          // ----------------------------------------------------
          // Section 23: Batch Processing for Performance <10s
          // Process cards in batches of 100 for optimal speed
          // ----------------------------------------------------
          const BATCH_SIZE = 100;
          const validatedCards = [];

          // Step 1: Validate and prepare all cards first
          for (let i = 0; i < cards.length; i++) {
            const row = cards[i];

            try {
              // ------------------------------------------------
              // Read CSV values
              // ------------------------------------------------
              const provider = row.Provider?.trim().toUpperCase();
              const type = row.Type?.trim().toUpperCase();
              const value = row.Value?.trim();
              const pin = row.PIN?.trim();
              const expiryDate = row.ExpiryDate?.trim();
              const batchNumber = row.BatchNumber?.trim() || null;

              // ------------------------------------------------
              // Validate required fields
              // ------------------------------------------------
              if (!provider || !type || !value || !pin || !expiryDate) {
                throw new Error("Missing required field");
              }

              // Section 16: ExpiryDate must be YYYY-MM-DD format
              if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
                throw new Error("ExpiryDate must be in YYYY-MM-DD format (e.g. 2027-12-31)");
              }

              // ------------------------------------------------
              // Validate PIN — Section 16: alphanumeric, 10-20 chars
              // ------------------------------------------------
              if (!/^[A-Za-z0-9]{10,20}$/.test(pin)) {
                throw new Error(
                  "PIN must be alphanumeric and 10-20 characters",
                );
              }

              // ------------------------------------------------
              // Validate card type
              // ------------------------------------------------
              const allowedTypes = ["AIRTIME", "DATA", "SMS"];

              if (!allowedTypes.includes(type)) {
                throw new Error("Type must be AIRTIME, DATA, or SMS");
              }

              // ------------------------------------------------
              // FR-002: Generate PIN hash for duplicate detection
              // ------------------------------------------------
              const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

              // ------------------------------------------------
              // Encrypt PIN using AES-256-GCM
              // ------------------------------------------------
              const encryptedPin = encrypt(pin);

              // ------------------------------------------------
              // Generate unique card UUID
              // ------------------------------------------------
              const cardUuid = crypto.randomUUID();

              validatedCards.push({
                rowIndex: i,
                cardUuid,
                provider,
                type,
                value,
                encryptedPin,
                pinHash,
                expiryDate,
                batchNumber,
              });
            } catch (rowError) {
              failed++;
              errors.push({
                row: i + 2,
                message: rowError?.message || "Validation error",
                code: "VALIDATION_ERROR",
              });
            }
          }

          // Step 2: Batch duplicate check for all PIN hashes
          if (validatedCards.length > 0) {
            const allPinHashes = validatedCards.map(c => c.pinHash);
            
            // Check all hashes in one query
            const [existingCards] = await db.query(
              `SELECT pin_hash FROM cards WHERE pin_hash IN (?)`,
              [allPinHashes]
            );

            const existingHashSet = new Set(existingCards.map(c => c.pin_hash));

            // Filter out duplicates
            const cardsToInsert = validatedCards.filter(card => {
              if (existingHashSet.has(card.pinHash)) {
                failed++;
                errors.push({
                  row: card.rowIndex + 2,
                  message: "Duplicate PIN detected (FR-002)",
                  code: "DUPLICATE_PIN",
                });
                return false;
              }
              return true;
            });

            // Step 3: Batch insert cards in chunks of BATCH_SIZE
            for (let i = 0; i < cardsToInsert.length; i += BATCH_SIZE) {
              const batch = cardsToInsert.slice(i, i + BATCH_SIZE);
              
              try {
                // Build multi-row INSERT statement
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                const values = [];

                for (const card of batch) {
                  values.push(
                    card.cardUuid,
                    card.provider,
                    card.type,
                    card.value,
                    card.encryptedPin.encrypted,
                    card.encryptedPin.iv,
                    card.encryptedPin.authTag,
                    card.pinHash,
                    card.expiryDate,
                    card.batchNumber,
                    'AVAILABLE'
                  );
                }

                const sql = `
                  INSERT INTO cards
                  (card_uuid, provider, type, value, pin_encrypted, pin_iv, 
                   pin_auth_tag, pin_hash, expiry_date, batch_number, status)
                  VALUES ${placeholders}
                `;

                await db.query(sql, values);
                imported += batch.length;

              } catch (batchError) {
                console.error("========== BATCH INSERT ERROR ==========");
                console.error(batchError);
                console.error("=======================================");

                // If batch fails, try individual inserts for this batch
                for (const card of batch) {
                  try {
                    await db.query(
                      `INSERT INTO cards
                       (card_uuid, provider, type, value, pin_encrypted, pin_iv, 
                        pin_auth_tag, pin_hash, expiry_date, batch_number, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
                      [
                        card.cardUuid,
                        card.provider,
                        card.type,
                        card.value,
                        card.encryptedPin.encrypted,
                        card.encryptedPin.iv,
                        card.encryptedPin.authTag,
                        card.pinHash,
                        card.expiryDate,
                        card.batchNumber,
                        'AVAILABLE'
                      ]
                    );
                    imported++;
                  } catch (singleError) {
                    failed++;
                    errors.push({
                      row: card.rowIndex + 2,
                      message: singleError?.message || "Database insert error",
                      code: singleError?.code || "INSERT_ERROR",
                    });
                  }
                }
              }
            }
          }

          // ----------------------------------------------------
          // Delete temporary uploaded CSV
          // ----------------------------------------------------
          fs.unlink(req.file.path, (err) => {
            if (err) {
              console.error("Failed to delete uploaded CSV:", err.message);
            }
          });

          // ----------------------------------------------------
          // Return import result
          // ----------------------------------------------------
          await writeAuditLog({
            userId: req.user?.id,
            action: "UPLOAD",
            cardId: null,
            details: {
              total: cards.length,
              imported,
              failed,
              message: "CSV card import completed",
            },
            ip: req.ip || null,
          });
          return res.json({
            success: true,
            message: "CSV processing completed",
            total: cards.length,
            imported,
            failed,
            errors,
          });
        } catch (error) {
          console.error("CSV processing error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to process CSV",
            error: error.message,
          });
        }
      })
      .on("error", (error) => {
        console.error("CSV read error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to read CSV file",
          error: error.message,
        });
      });
  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json({
      success: false,
      message: "CSV upload failed",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/inventory/cards
// Add a single card manually (FR-004)
// ============================================================
const addCard = async (req, res) => {
  console.log("=== ADD CARD REQUEST RECEIVED ===");
  console.log("Request body:", req.body);
  console.log("User:", req.user);
  
  try {
    const { provider, type, category, package_type, package_value, value, pin, expiry_date, batch_number } = req.body;
    
    console.log("Parsed fields:", { provider, type, category, package_type, package_value, value, pin: pin?.substring(0,4)+"...", expiry_date, batch_number });

    // Validate required fields
    if (!provider || !type || !value || !pin || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: "provider, type, value, pin, and expiry_date are required",
      });
    }

    // Validate type (SRS FR-001: Only AIRTIME, DATA, SMS)
    const cardType = String(type).trim().toUpperCase();
    const allowedTypes = ["AIRTIME", "DATA", "SMS"];
    if (!allowedTypes.includes(cardType)) {
      return res.status(400).json({
        success: false,
        message: "type must be AIRTIME, DATA, or SMS (per SRS FR-001)",
      });
    }

    // Validate value is a number
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "value must be a positive number",
      });
    }

    // Validate PIN format
    if (!/^[A-Za-z0-9]{10,20}$/.test(pin.trim())) {
      return res.status(400).json({
        success: false,
        message: "PIN must be alphanumeric and 10-20 characters",
      });
    }

    // FR-002: Check for duplicate PIN using SHA-256 hash
    const pinHash = crypto.createHash('sha256').update(pin.trim()).digest('hex');
    
    const [duplicateCheck] = await db.query(
      "SELECT id FROM cards WHERE pin_hash = ?",
      [pinHash]
    );

    if (duplicateCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Duplicate PIN detected. This PIN already exists in the system (FR-002)",
      });
    }

    const encryptedPin = encrypt(pin.trim());
    const cardUuid = crypto.randomUUID();

    const [result] = await db.query(
      `INSERT INTO cards
       (card_uuid, provider, type, value, 
        pin_encrypted, pin_iv, pin_auth_tag, pin_hash, expiry_date, batch_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
      [
        cardUuid,
        String(provider).trim(),
        cardType,
        numericValue,
        encryptedPin.encrypted,
        encryptedPin.iv,
        encryptedPin.authTag,
        pinHash,
        expiry_date,
        batch_number?.trim() || null,
      ],
    );

    await writeAuditLog({
      userId: req.user?.id,
      action: "UPLOAD",
      cardId: result.insertId,
      details: { 
        message: "Single card added manually", 
        card_uuid: cardUuid,
        type: cardType,
        value: numericValue
      },
      ip: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: `Card added successfully - ${cardType} ${numericValue} ETB`,
      card: {
        id: result.insertId,
        card_uuid: cardUuid,
        provider: String(provider).trim(),
        type: cardType,
        value: numericValue,
        expiry_date,
        batch_number: batch_number?.trim() || null,
        status: "AVAILABLE",
      },
    });
  } catch (error) {
    console.error("Add card error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add card",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/inventory/stats
// Inventory statistics (FR-005, FR-006, FR-007)
// ============================================================
const getInventoryStats = async (req, res) => {
  try {
    const [statusRows] = await db.query(`
      SELECT status, COUNT(*) AS total, COALESCE(SUM(value), 0) AS total_value
      FROM cards
      GROUP BY status
    `);

    const [providerRows] = await db.query(`
      SELECT provider, type, COUNT(*) AS total, COALESCE(SUM(value), 0) AS total_value
      FROM cards
      WHERE status = 'AVAILABLE'
      GROUP BY provider, type
      ORDER BY provider, type
    `);

    const [expiringRows] = await db.query(`
      SELECT COUNT(*) AS expiring_soon
      FROM cards
      WHERE status = 'AVAILABLE'
        AND expiry_date IS NOT NULL
        AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND expiry_date >= CURDATE()
    `);

    const [expiredRows] = await db.query(`
      SELECT COUNT(*) AS expired
      FROM cards
      WHERE status = 'AVAILABLE'
        AND expiry_date IS NOT NULL
        AND expiry_date < CURDATE()
    `);

    const stats = { available: 0, allocated: 0, used: 0, expired: 0, total: 0 };
    for (const row of statusRows) {
      stats[row.status.toLowerCase()] = Number(row.total);
      stats.total += Number(row.total);
    }

    return res.json({
      success: true,
      stats,
      by_provider: providerRows,
      expiring_soon: Number(expiringRows[0]?.expiring_soon || 0),
      expired_available: Number(expiredRows[0]?.expired || 0),
    });
  } catch (error) {
    console.error("Get inventory stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory stats",
      error: error.message,
    });
  }
};

// ============================================================
// PATCH /api/inventory/cards/:id/status
// Manually update card status (FR-035: admin marks EXPIRED/USED)
// ============================================================
const updateCardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["EXPIRED","USED","AVAILABLE"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(", ")}` });
    }

    const [existing] = await db.query("SELECT id, status FROM cards WHERE id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: "Card not found" });

    await db.query("UPDATE cards SET status = ? WHERE id = ?", [status, id]);

    await writeAuditLog({
      userId: req.user?.id,
      action: "EXPIRE",
      cardId: Number(id),
      details: { message: `Card #${id} manually set to ${status}`, prev_status: existing[0].status },
      ip: req.ip || null,
    });

    return res.json({ success: true, message: `Card #${id} status updated to ${status}`, card: { id: Number(id), status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Update failed", error: error.message });
  }
};

// ============================================================
// EXPORT CONTROLLERS
// ============================================================
module.exports = {
  getCards,
  getCardById,
  uploadCards,
  addCard,
  getInventoryStats,
  updateCardStatus,
};

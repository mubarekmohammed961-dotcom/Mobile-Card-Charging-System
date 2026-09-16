-- ============================================================
-- MCCS DATABASE MIGRATION
-- Adds missing tables and columns for notifications, schedules, 
-- and PIN duplicate detection
-- Run this against your existing mccs_db database
-- ============================================================

USE mccs_db;

-- ============================================================
-- 1. ADD pin_hash COLUMN TO cards TABLE (FR-002)
-- ============================================================
ALTER TABLE cards 
ADD COLUMN pin_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 hash of PIN for duplicate detection (FR-002)' AFTER pin_auth_tag,
ADD UNIQUE INDEX idx_pin_hash (pin_hash);

-- ============================================================
-- 2. CREATE DISTRIBUTION SCHEDULES TABLE (FR-019, Section 15)
-- ============================================================
CREATE TABLE IF NOT EXISTS distribution_schedules (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id     INT UNSIGNED NOT NULL,
  cron_expression   VARCHAR(100) NOT NULL COMMENT 'Cron format: minute hour day month day-of-week',
  schedule_name     VARCHAR(200) NOT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_by        INT UNSIGNED NOT NULL,
  updated_by        INT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dept_schedule (department_id),
  INDEX idx_schedule_active (is_active),
  CONSTRAINT fk_schedule_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_schedule_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_schedule_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. CREATE NOTIFICATIONS TABLE (Section 18)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  type          ENUM('REMINDER','LOW_INVENTORY','DISTRIBUTION','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  link          VARCHAR(255) DEFAULT NULL,
  is_read       TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_read (is_read),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. CREATE AUDIT ARCHIVE TABLE (Section 20 - 7-Year Retention)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_archive (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_id   INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED DEFAULT NULL,
  action        ENUM('UPLOAD','ALLOCATE','SEND','CONFIRM','USE','EXPIRE',
                     'LOGIN','LOGOUT','DELETE','UPDATE') NOT NULL,
  card_id       INT UNSIGNED DEFAULT NULL,
  details       JSON DEFAULT NULL,
  ip            VARCHAR(60) DEFAULT NULL,
  created_at    DATETIME NOT NULL,
  archived_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_archive_created (created_at),
  INDEX idx_archive_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. ADD APPROVAL COLUMNS TO DISTRIBUTIONS TABLE (BR-004)
-- ============================================================
ALTER TABLE distributions 
ADD COLUMN requires_approval TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'BR-004: Requires dept head approval if exceeds budget' AFTER status,
ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT NULL COMMENT 'BR-004: Approval status' AFTER requires_approval;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
SELECT 'Migration completed successfully!' AS status;

-- ============================================================
-- VERIFY TABLES EXIST
-- ============================================================
SELECT 
  TABLE_NAME,
  CASE 
    WHEN TABLE_NAME IN ('cards', 'distributions', 'distribution_schedules', 'notifications', 'audit_archive') 
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END AS status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mccs_db'
  AND TABLE_NAME IN ('cards', 'distributions', 'distribution_schedules', 'notifications', 'audit_archive')
ORDER BY TABLE_NAME;

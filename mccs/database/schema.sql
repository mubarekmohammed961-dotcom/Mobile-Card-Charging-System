-- ============================================================
-- MCCS - Mobile Card Charging System
-- Complete Database Schema
-- Run this in MySQL / phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS mccs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mccs_db;

-- ============================================================
-- USERS (Auth + Roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('SUPER_ADMIN','SYSTEM_ADMIN','STORE_OFFICER','DEPARTMENT_HEAD','STAFF','AUDITOR')
                              NOT NULL DEFAULT 'STORE_OFFICER',
  phone         VARCHAR(30)   DEFAULT NULL,
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- USER SESSIONS (Session & Cookie Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  session_id      VARCHAR(128) NOT NULL UNIQUE,
  ip_address      VARCHAR(45) DEFAULT NULL COMMENT 'IPv4 or IPv6',
  user_agent      VARCHAR(500) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_sessions_user (user_id),
  INDEX idx_user_sessions_session (session_id),
  INDEX idx_user_sessions_activity (last_activity),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='User session tracking for security';

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_name   VARCHAR(150) NOT NULL UNIQUE,
  department_code   VARCHAR(30)  NOT NULL UNIQUE,
  budget            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description       TEXT         DEFAULT NULL,
  status            ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id     VARCHAR(50)  NOT NULL UNIQUE,
  full_name       VARCHAR(150) NOT NULL,
  department_id   INT UNSIGNED NOT NULL,
  designation     VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  phone           VARCHAR(30)  DEFAULT NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- ============================================================
-- ELIGIBILITY RULES (FR-010)
-- ============================================================
CREATE TABLE IF NOT EXISTS eligibility_rules (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_id        INT UNSIGNED NOT NULL,
  card_type       ENUM('AIRTIME','DATA','SMS') NOT NULL,
  monthly_quota   INT UNSIGNED NOT NULL DEFAULT 1,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_card_type (staff_id, card_type),
  CONSTRAINT fk_eligibility_staff FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB;

-- ============================================================
-- CARDS (Inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  card_uuid       VARCHAR(36)  NOT NULL UNIQUE,
  provider        VARCHAR(50)  NOT NULL,
  type            ENUM('AIRTIME','DATA','SMS') NOT NULL,
  value           DECIMAL(10,2) NOT NULL,
  pin_encrypted   TEXT         NOT NULL,
  pin_iv          VARCHAR(64)  NOT NULL,
  pin_auth_tag    VARCHAR(64)  NOT NULL,
  pin_hash        VARCHAR(64)  NOT NULL UNIQUE COMMENT 'SHA-256 hash of PIN for duplicate detection (FR-002)',
  expiry_date     DATE         DEFAULT NULL,
  batch_number    VARCHAR(100) DEFAULT NULL,
  status          ENUM('AVAILABLE','ALLOCATED','DELIVERED','CONFIRMED','USED','EXPIRED')
                               NOT NULL DEFAULT 'AVAILABLE',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_type   (type),
  INDEX idx_expiry (expiry_date),
  INDEX idx_pin_hash (pin_hash)
) ENGINE=InnoDB;

-- ============================================================
-- DISTRIBUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS distributions (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distribution_uuid   VARCHAR(36)  NOT NULL UNIQUE,
  month               DATE         NOT NULL,
  department_id       INT UNSIGNED NOT NULL,
  initiated_by        INT UNSIGNED NOT NULL,
  total_cards         INT UNSIGNED NOT NULL DEFAULT 0,
  total_value         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status              ENUM('DRAFT','CONFIRMED','SENT','COMPLETED') NOT NULL DEFAULT 'CONFIRMED',
  requires_approval   TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'BR-004: Requires dept head approval if exceeds budget',
  approval_status     ENUM('PENDING','APPROVED','REJECTED') DEFAULT NULL COMMENT 'BR-004: Approval status',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_distribution_month (month),
  INDEX idx_distribution_dept  (department_id),
  INDEX idx_distribution_approval (requires_approval, approval_status),
  CONSTRAINT fk_distribution_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_distribution_user FOREIGN KEY (initiated_by)  REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- DISTRIBUTION ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS distribution_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distribution_id   INT UNSIGNED NOT NULL,
  card_id           INT UNSIGNED NOT NULL,
  staff_id          INT UNSIGNED NOT NULL,
  allocated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_di_distribution (distribution_id),
  INDEX idx_di_staff        (staff_id),
  CONSTRAINT fk_di_distribution FOREIGN KEY (distribution_id) REFERENCES distributions(id),
  CONSTRAINT fk_di_card         FOREIGN KEY (card_id)         REFERENCES cards(id),
  CONSTRAINT fk_di_staff        FOREIGN KEY (staff_id)        REFERENCES staff(id)
) ENGINE=InnoDB;

-- ============================================================
-- DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distribution_item_id    INT UNSIGNED NOT NULL,
  delivery_method         ENUM('EMAIL','SMS') NOT NULL DEFAULT 'EMAIL',
  sent_at                 DATETIME     DEFAULT NULL,
  confirmation_token      VARCHAR(128) NOT NULL UNIQUE,
  token_expiry            DATETIME     NOT NULL,
  status                  ENUM('PENDING','SENT','DELIVERED','CONFIRMED','EXPIRED')
                                       NOT NULL DEFAULT 'PENDING',
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_delivery_token  (confirmation_token),
  INDEX idx_delivery_status (status),
  CONSTRAINT fk_delivery_item FOREIGN KEY (distribution_item_id) REFERENCES distribution_items(id)
) ENGINE=InnoDB;

-- ============================================================
-- CONFIRMATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS confirmations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id     INT UNSIGNED NOT NULL,
  confirmed_by    INT UNSIGNED NOT NULL,
  confirmed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address      VARCHAR(60)  DEFAULT NULL,
  user_agent      TEXT         DEFAULT NULL,
  CONSTRAINT fk_confirmation_delivery FOREIGN KEY (delivery_id)  REFERENCES deliveries(id),
  CONSTRAINT fk_confirmation_user     FOREIGN KEY (confirmed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  card_id         INT UNSIGNED NOT NULL,
  staff_id        INT UNSIGNED NOT NULL,
  marked_used_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks         VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_usage_card  FOREIGN KEY (card_id)  REFERENCES cards(id),
  CONSTRAINT fk_usage_staff FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB;

-- ============================================================
-- AUDIT LOGS (FR-042, Section 20)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED DEFAULT NULL,
  action      ENUM('UPLOAD','ALLOCATE','SEND','CONFIRM','USE','EXPIRE',
                   'LOGIN','LOGOUT','DELETE','UPDATE') NOT NULL,
  card_id     INT UNSIGNED DEFAULT NULL,
  details     JSON         DEFAULT NULL,
  ip          VARCHAR(60)  DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_action  (action),
  INDEX idx_audit_user    (user_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- DISTRIBUTION SCHEDULES (FR-019, Section 15)
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
-- NOTIFICATIONS (Section 18 - In-App Notifications)
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
-- AUDIT ARCHIVE (Section 20 - 7-Year Retention)
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
-- DEFAULT SUPER ADMIN USER
-- Password: Admin@1234  (bcrypt hash)
-- ============================================================
INSERT IGNORE INTO users (full_name, email, password, role, status)
VALUES (
  'Super Administrator',
  'admin@mccs.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGwT5Gv.7FqHUqj8vNjGlBz.tRe',
  'SUPER_ADMIN',
  'ACTIVE'
);

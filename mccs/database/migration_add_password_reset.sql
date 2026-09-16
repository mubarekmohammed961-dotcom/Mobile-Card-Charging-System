-- ============================================================
-- MCCS - Add Password Reset & Login Attempt Tracking
-- Run: mysql -u root -p mccs_db < migration_add_password_reset.sql
-- ============================================================

USE mccs_db;

-- ============================================================
-- CREATE password_resets TABLE
-- Stores password reset tokens with expiry
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  email           VARCHAR(150) NOT NULL,
  token           VARCHAR(255) NOT NULL UNIQUE,
  expires_at      DATETIME NOT NULL,
  used            TINYINT(1) NOT NULL DEFAULT 0,
  used_at         DATETIME DEFAULT NULL,
  ip_address      VARCHAR(45) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_password_resets_token (token),
  INDEX idx_password_resets_email (email),
  INDEX idx_password_resets_expires (expires_at),
  INDEX idx_password_resets_user (user_id)
) ENGINE=InnoDB COMMENT='Password reset tokens';

-- ============================================================
-- CREATE login_attempts TABLE
-- Tracks failed login attempts for rate limiting
-- ============================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(150) NOT NULL,
  ip_address      VARCHAR(45) DEFAULT NULL,
  user_agent      VARCHAR(500) DEFAULT NULL,
  success         TINYINT(1) NOT NULL DEFAULT 0,
  failure_reason  VARCHAR(255) DEFAULT NULL,
  attempted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_login_attempts_email (email, attempted_at),
  INDEX idx_login_attempts_ip (ip_address, attempted_at)
) ENGINE=InnoDB COMMENT='Login attempt tracking for security';

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'Password reset tables created successfully!' as status;

-- Show table structures
DESCRIBE password_resets;
DESCRIBE login_attempts;

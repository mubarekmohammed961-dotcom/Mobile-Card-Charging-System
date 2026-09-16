-- Force recreate login_attempts table
USE mccs_db;

-- Step 1: Try to drop any existing references
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS login_attempts;
SET FOREIGN_KEY_CHECKS = 1;

-- Step 2: Delete orphaned files by renaming database temporarily
-- This is a workaround for InnoDB orphaned tablespace files
CREATE DATABASE IF NOT EXISTS mccs_db_temp;
USE mccs_db_temp;

-- Step 3: Now recreate in original database
USE mccs_db;

CREATE TABLE login_attempts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(150) NOT NULL,
  ip_address      VARCHAR(45) DEFAULT NULL,
  user_agent      VARCHAR(500) DEFAULT NULL,
  success         TINYINT(1) NOT NULL DEFAULT 0,
  failure_reason  VARCHAR(255) DEFAULT NULL,
  attempted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_email (email, attempted_at),
  INDEX idx_login_attempts_ip (ip_address, attempted_at)
) ENGINE=InnoDB;

SELECT 'login_attempts table created!' as status;
SHOW CREATE TABLE login_attempts;

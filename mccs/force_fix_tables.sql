-- Force fix corrupted tables using RENAME workaround
USE mccs_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Create temporary database for cleanup
CREATE DATABASE IF NOT EXISTS mccs_temp;

-- Try to move corrupted tables to temp database (will fail but helps cleanup)
RENAME TABLE mccs_db.login_attempts TO mccs_temp.login_attempts_old;
RENAME TABLE mccs_db.audit_logs TO mccs_temp.audit_logs_old;

-- Now recreate in original database
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

CREATE TABLE audit_logs (
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

SET FOREIGN_KEY_CHECKS = 1;

-- Cleanup
DROP DATABASE IF EXISTS mccs_temp;

SELECT 'Tables fixed!' as status;

-- Initialize missing tables for MCCS
USE mccs_db;

-- Create password_resets if doesn't exist
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
) ENGINE=InnoDB;

-- Insert test users with correct password hash for: password123
DELETE FROM users WHERE email IN ('admin@mccs.com', 'power.head@mccs.com', 'officer@mccs.com');

INSERT INTO users (full_name, email, password, role, phone, status) VALUES 
('System Administrator', 'admin@mccs.com', '$2b$10$1i9D2cjqnawp51r124oziezwCD9xog69D.xilACm06noDjs19TCS2', 'SYSTEM_ADMIN', '+251911234567', 'ACTIVE'),
('Power Department Head', 'power.head@mccs.com', '$2b$10$1i9D2cjqnawp51r124oziezwCD9xog69D.xilACm06noDjs19TCS2', 'DEPARTMENT_HEAD', '+251912345678', 'ACTIVE'),
('Store Officer', 'officer@mccs.com', '$2b$10$1i9D2cjqnawp51r124oziezwCD9xog69D.xilACm06noDjs19TCS2', 'STORE_OFFICER', '+251913456789', 'ACTIVE');

SELECT 'Database initialized successfully!' as status;
SELECT id, email, role, status, LEFT(password, 15) as password_hash FROM users;

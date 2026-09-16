-- ============================================================
-- MCCS - Add Session Management Tables
-- Run: mysql -u root -p mccs_db < migration_add_sessions.sql
-- ============================================================

USE mccs_db;

-- ============================================================
-- CREATE user_sessions TABLE
-- Tracks active user sessions for security and monitoring
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
  
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='User session tracking for security';

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'user_sessions table created successfully!' as status;

-- Show table structure
DESCRIBE user_sessions;

-- Show indexes
SHOW INDEX FROM user_sessions;

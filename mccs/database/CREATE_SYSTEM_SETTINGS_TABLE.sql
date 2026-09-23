-- ============================================================
-- SYSTEM SETTINGS TABLE - MISSING FROM ORIGINAL SCHEMA
-- This table is REQUIRED for System Settings page to function
-- Referenced by: settingsController.js, SystemSettings.jsx
-- ============================================================

USE mccs_db;

CREATE TABLE IF NOT EXISTS system_settings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key     VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier for the setting (e.g., smtp_host)',
  setting_value   TEXT DEFAULT NULL COMMENT 'Current value of the setting',
  setting_group   ENUM('general','email','sms','inventory','delivery','distribution','cron','security') 
                  NOT NULL DEFAULT 'general' COMMENT 'Group for organizing settings in UI',
  description     VARCHAR(500) DEFAULT NULL COMMENT 'Human-readable description',
  is_sensitive    TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Password/Secret (hidden in UI), 0=Public',
  data_type       ENUM('string','number','boolean','email','url','cron') 
                  NOT NULL DEFAULT 'string' COMMENT 'Validation type',
  updated_by      INT UNSIGNED DEFAULT NULL COMMENT 'Last admin who updated this setting',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_system_settings_group (setting_group),
  INDEX idx_system_settings_key (setting_key),
  CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Configurable system settings for SMTP, inventory, cron, security';

-- ============================================================
-- INSERT DEFAULT SYSTEM SETTINGS (37 settings - SRS Compliant)
-- These match FR-006 (Inventory Alerts), FR-028 (Reminders), 
-- NFR-002 (Security), and operational requirements
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- GENERAL SETTINGS (7 settings)
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('system_name', 'Mobile Card Charging System', 'general', 'Application name displayed in UI', 0, 'string'),
('system_version', '1.0.0', 'general', 'Current system version', 0, 'string'),
('system_timezone', 'Africa/Addis_Ababa', 'general', 'Server timezone for scheduling', 0, 'string'),
('organization_name', 'Ethiopian Government', 'general', 'Organization name', 0, 'string'),
('support_email', 'mubarekmohammed961@gmail.com', 'general', 'Support contact email', 0, 'email'),
('support_phone', '0954757566', 'general', 'Support contact phone', 0, 'string'),
('frontend_url', 'http://localhost:5173', 'general', 'Frontend URL for email links', 0, 'url')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- EMAIL / SMTP SETTINGS (9 settings) - FR-024, FR-029
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('smtp_enabled', 'true', 'email', 'Enable/disable email delivery', 0, 'boolean'),
('smtp_host', 'smtp.gmail.com', 'email', 'SMTP server hostname', 0, 'string'),
('smtp_port', '587', 'email', 'SMTP server port (587 for TLS, 465 for SSL)', 0, 'number'),
('smtp_secure', 'false', 'email', 'Use SSL/TLS (true for port 465)', 0, 'boolean'),
('smtp_user', '', 'email', 'SMTP authentication username (email address)', 1, 'email'),
('smtp_pass', '', 'email', 'SMTP authentication password or app password', 1, 'string'),
('smtp_from_name', 'MCCS System', 'email', 'Email sender display name', 0, 'string'),
('smtp_from_email', '', 'email', 'Email sender address', 0, 'email'),
('email_footer', 'Mobile Card Charging System - Ethiopian Government', 'email', 'Email signature footer', 0, 'string')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- SMS / TWILIO SETTINGS (6 settings) - FR-024 (Future)
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('sms_enabled', 'false', 'sms', 'Enable/disable SMS delivery (Twilio integration)', 0, 'boolean'),
('twilio_account_sid', '', 'sms', 'Twilio Account SID', 1, 'string'),
('twilio_auth_token', '', 'sms', 'Twilio Auth Token', 1, 'string'),
('twilio_phone_number', '', 'sms', 'Twilio phone number (sender)', 0, 'string'),
('sms_template', 'Your card PIN: {{PIN}}. Confirm: {{LINK}}', 'sms', 'SMS message template ({{PIN}}, {{LINK}} placeholders)', 0, 'string'),
('sms_test_mode', 'true', 'sms', 'Test mode (log SMS without sending)', 0, 'boolean')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- INVENTORY SETTINGS (4 settings) - FR-006
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('inventory_low_threshold', '50', 'inventory', 'Low inventory alert threshold (< 50 cards)', 0, 'number'),
('inventory_critical_threshold', '20', 'inventory', 'Critical inventory threshold (< 20 cards)', 0, 'number'),
('inventory_alert_recipients', '', 'inventory', 'Comma-separated emails for low inventory alerts', 0, 'string'),
('expiry_warning_days', '30', 'inventory', 'Days before expiry to show warning (default: 30)', 0, 'number')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- DELIVERY & REMINDERS SETTINGS (5 settings) - FR-028, BR-005
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('delivery_token_expiry_days', '7', 'delivery', 'Confirmation token expiry in days (BR-005: 7 days)', 0, 'number'),
('reminder_day_1', '3', 'delivery', 'First reminder after X days (default: Day 3)', 0, 'number'),
('reminder_day_2', '5', 'delivery', 'Second reminder after X days (default: Day 5)', 0, 'number'),
('reminder_day_3', '7', 'delivery', 'Third reminder after X days (default: Day 7)', 0, 'number'),
('admin_escalation_enabled', 'true', 'delivery', 'Escalate to admin after all reminders (FR-028)', 0, 'boolean')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- DISTRIBUTION SETTINGS (2 settings) - FR-037, BR-004
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('unconfirmed_reallocation_days', '30', 'distribution', 'Days after which unconfirmed cards can be reallocated (FR-037)', 0, 'number'),
('budget_approval_required', 'true', 'distribution', 'Require dept head approval for over-budget distributions (BR-004)', 0, 'boolean')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- CRON SCHEDULES (6 settings) - Automated Jobs
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('cron_daily_reminders', '0 9 * * *', 'cron', 'Daily reminder job (Default: 09:00 daily)', 0, 'cron'),
('cron_inventory_check', '0 2 * * 0', 'cron', 'Weekly inventory check (Default: 02:00 Sundays)', 0, 'cron'),
('cron_expired_tokens', '0 8 * * *', 'cron', 'Mark expired tokens (Default: 08:00 daily)', 0, 'cron'),
('cron_session_cleanup', '0 4 * * *', 'cron', 'Remove old sessions (Default: 04:00 daily)', 0, 'cron'),
('cron_monthly_summary', '0 7 1 * *', 'cron', 'Monthly dept summary (Default: 07:00 on 1st)', 0, 'cron'),
('cron_audit_archive', '0 3 1 1 *', 'cron', 'Annual audit archive (Default: 03:00 Jan 1st)', 0, 'cron')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ══════════════════════════════════════════════════════════════
-- SECURITY SETTINGS (5 settings) - NFR-002, Account Security
-- ══════════════════════════════════════════════════════════════
INSERT INTO system_settings (setting_key, setting_value, setting_group, description, is_sensitive, data_type) VALUES
('max_failed_login_attempts', '3', 'security', 'Max failed login attempts before lockout', 0, 'number'),
('account_lockout_minutes', '30', 'security', 'Account lockout duration in minutes', 0, 'number'),
('session_timeout_hours', '24', 'security', 'User session timeout in hours', 0, 'number'),
('password_min_length', '8', 'security', 'Minimum password length', 0, 'number'),
('force_https', 'false', 'security', 'Force HTTPS in production (recommended: true)', 0, 'boolean')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 
  setting_group, 
  COUNT(*) as count 
FROM system_settings 
GROUP BY setting_group 
ORDER BY setting_group;

SELECT 
  'Total Settings' as metric, 
  COUNT(*) as count 
FROM system_settings;

-- Expected output:
-- general:      7 settings
-- email:        9 settings
-- sms:          6 settings
-- inventory:    4 settings
-- delivery:     5 settings
-- distribution: 2 settings
-- cron:         6 settings
-- security:     5 settings
-- TOTAL:       44 settings

-- ============================================================
-- NOTES:
-- 1. Run this BEFORE starting the backend server
-- 2. Configure SMTP credentials via System Settings UI
-- 3. Adjust cron schedules based on operational needs
-- 4. Enable SMS when Twilio account is ready
-- 5. All sensitive fields (passwords) are masked in UI
-- ============================================================

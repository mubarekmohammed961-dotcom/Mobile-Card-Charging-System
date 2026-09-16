-- ============================================================
-- AUDIT LOG ACTIONS ENHANCEMENT
-- SRS Section 20 - NFR-004: Complete Audit Trail
-- ============================================================

-- Add more specific audit actions for better compliance
ALTER TABLE audit_logs 
MODIFY COLUMN action ENUM(
  'UPLOAD',
  'ALLOCATE',
  'SEND',
  'CONFIRM',
  'USE',
  'EXPIRE',
  'LOGIN',
  'LOGOUT',
  'DELETE',
  'UPDATE',
  'CREATE',
  'APPROVE',
  'REJECT',
  'REGISTER',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_CHANGED',
  'STATUS_CHANGE',
  'ROLE_CHANGE'
) NOT NULL;

-- Add comment for clarity
ALTER TABLE audit_logs 
COMMENT = 'NFR-004: Immutable audit trail for all system actions (7-year retention per Section 20)';

SELECT 'Audit actions enhanced successfully!' AS status;

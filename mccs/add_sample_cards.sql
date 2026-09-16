-- Add sample cards for presentation
USE mccs_db;

-- Sample AIRTIME cards
INSERT INTO cards (card_uuid, provider, type, value, pin_encrypted, pin_iv, pin_auth_tag, pin_hash, expiry_date, batch_number, status) VALUES
(UUID(), 'MTN', 'AIRTIME', 100.00, 'encrypted_pin_1', 'iv_1', 'auth_tag_1', SHA2('PIN001', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-001', 'AVAILABLE'),
(UUID(), 'MTN', 'AIRTIME', 200.00, 'encrypted_pin_2', 'iv_2', 'auth_tag_2', SHA2('PIN002', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-001', 'AVAILABLE'),
(UUID(), 'MTN', 'AIRTIME', 500.00, 'encrypted_pin_3', 'iv_3', 'auth_tag_3', SHA2('PIN003', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-001', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'AIRTIME', 100.00, 'encrypted_pin_4', 'iv_4', 'auth_tag_4', SHA2('PIN004', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-002', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'AIRTIME', 200.00, 'encrypted_pin_5', 'iv_5', 'auth_tag_5', SHA2('PIN005', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-002', 'AVAILABLE');

-- Sample DATA cards
INSERT INTO cards (card_uuid, provider, type, value, pin_encrypted, pin_iv, pin_auth_tag, pin_hash, expiry_date, batch_number, status) VALUES
(UUID(), 'MTN', 'DATA', 250.00, 'encrypted_pin_6', 'iv_6', 'auth_tag_6', SHA2('PIN006', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-003', 'AVAILABLE'),
(UUID(), 'MTN', 'DATA', 500.00, 'encrypted_pin_7', 'iv_7', 'auth_tag_7', SHA2('PIN007', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-003', 'AVAILABLE'),
(UUID(), 'MTN', 'DATA', 1000.00, 'encrypted_pin_8', 'iv_8', 'auth_tag_8', SHA2('PIN008', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-003', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'DATA', 300.00, 'encrypted_pin_9', 'iv_9', 'auth_tag_9', SHA2('PIN009', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-004', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'DATA', 600.00, 'encrypted_pin_10', 'iv_10', 'auth_tag_10', SHA2('PIN010', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-004', 'AVAILABLE');

-- Sample SMS cards
INSERT INTO cards (card_uuid, provider, type, value, pin_encrypted, pin_iv, pin_auth_tag, pin_hash, expiry_date, batch_number, status) VALUES
(UUID(), 'MTN', 'SMS', 50.00, 'encrypted_pin_11', 'iv_11', 'auth_tag_11', SHA2('PIN011', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-005', 'AVAILABLE'),
(UUID(), 'MTN', 'SMS', 100.00, 'encrypted_pin_12', 'iv_12', 'auth_tag_12', SHA2('PIN012', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-005', 'AVAILABLE'),
(UUID(), 'MTN', 'SMS', 150.00, 'encrypted_pin_13', 'iv_13', 'auth_tag_13', SHA2('PIN013', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-005', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'SMS', 75.00, 'encrypted_pin_14', 'iv_14', 'auth_tag_14', SHA2('PIN014', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-006', 'AVAILABLE'),
(UUID(), 'Ethio Telecom', 'SMS', 125.00, 'encrypted_pin_15', 'iv_15', 'auth_tag_15', SHA2('PIN015', 256), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'BATCH-2026-006', 'AVAILABLE');

-- Add some sample staff members
INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active) VALUES
('EMP001', 'John Doe', 1, 'IT Manager', 'john.doe@company.com', '+251911111111', 1),
('EMP002', 'Jane Smith', 1, 'Software Developer', 'jane.smith@company.com', '+251922222222', 1),
('EMP003', 'Mike Johnson', 2, 'HR Manager', 'mike.johnson@company.com', '+251933333333', 1);

SELECT 'Sample data added successfully!' as status;
SELECT 
    type,
    provider,
    COUNT(*) as total_cards,
    SUM(value) as total_value
FROM cards 
GROUP BY type, provider;

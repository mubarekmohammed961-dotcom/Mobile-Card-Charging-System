USE mccs_db;

-- Update admin password to Admin@1234
UPDATE users 
SET password = '$2b$10$/dhKfEFMzLFPZca1ZWtU8Ox9gBviCVIeXOOuZv8ymcY3C8myrCRzG'
WHERE email = 'admin@mccs.com';

SELECT 'Password updated!' as status;
SELECT id, email, role FROM users WHERE email = 'admin@mccs.com';

-- ================================================================
-- MIGRATION: USD to ETB - Card Structure Redesign
-- Changes: $ → ETB, New card categories and package types
-- ================================================================

USE mccs_db;

-- Step 1: Add new columns to cards table
ALTER TABLE cards 
ADD COLUMN category ENUM('AIRTIME','VOICE','DATA','SMS') NULL AFTER type,
ADD COLUMN package_type ENUM('BIRR','MB','GB','UNLIMITED','SMS_PACKAGE') NULL AFTER category,
ADD COLUMN package_value VARCHAR(50) NULL AFTER package_type;

-- Step 2: Migrate existing data
-- AIRTIME cards → category=AIRTIME, package_type=BIRR
UPDATE cards 
SET category = 'AIRTIME', 
    package_type = 'BIRR',
    package_value = CONCAT(value, ' ETB')
WHERE type = 'AIRTIME';

-- DATA cards with small values (< 100) → assume GB
UPDATE cards 
SET category = 'DATA',
    package_type = 'GB',
    package_value = CONCAT(value, ' GB')
WHERE type = 'DATA' AND value < 100;

-- DATA cards with large values (>= 100) → assume MB or Birr
UPDATE cards 
SET category = 'DATA',
    package_type = 'MB',
    package_value = CONCAT(value, ' MB')
WHERE type = 'DATA' AND value >= 100 AND value < 1000;

-- DATA cards with very large values (>= 1000) → Birr packages
UPDATE cards 
SET category = 'DATA',
    package_type = 'BIRR',
    package_value = CONCAT(value, ' ETB')
WHERE type = 'DATA' AND value >= 1000;

-- SMS cards → category=SMS, package_type=SMS_PACKAGE or BIRR
UPDATE cards 
SET category = 'SMS',
    package_type = 'SMS_PACKAGE',
    package_value = CONCAT(value, ' SMS')
WHERE type = 'SMS' AND value <= 500;

UPDATE cards 
SET category = 'SMS',
    package_type = 'BIRR',
    package_value = CONCAT(value, ' ETB')
WHERE type = 'SMS' AND value > 500;

-- Step 3: Update type column to include VOICE
ALTER TABLE cards 
MODIFY COLUMN type ENUM('AIRTIME','VOICE','DATA','SMS') NOT NULL;

-- Step 4: Make category and package_type required after migration
ALTER TABLE cards 
MODIFY COLUMN category ENUM('AIRTIME','VOICE','DATA','SMS') NOT NULL,
MODIFY COLUMN package_type ENUM('BIRR','MB','GB','UNLIMITED','SMS_PACKAGE') NOT NULL;

-- Step 5: Update departments budget column comment (for clarity)
ALTER TABLE departments 
MODIFY COLUMN budget DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Monthly budget in ETB (Ethiopian Birr)';

-- Step 6: Update distributions total_value column comment
ALTER TABLE distributions 
MODIFY COLUMN total_value DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Total value in ETB (Ethiopian Birr)';

-- Step 7: Verify changes
SELECT 'Migration completed! Checking sample cards...' as status;

SELECT id, provider, type, category, package_type, package_value, value, status 
FROM cards 
LIMIT 10;

SELECT 'Checking departments budget (ETB)...' as status;

SELECT id, department_name, budget 
FROM departments 
WHERE status = 'ACTIVE' 
LIMIT 5;

SELECT 'Migration Summary:' as status;

SELECT 
    category,
    package_type,
    COUNT(*) as card_count,
    SUM(value) as total_value_etb
FROM cards
GROUP BY category, package_type
ORDER BY category, package_type;

-- ================================================================
-- MIGRATION COMPLETE
-- All currency values now in ETB (Ethiopian Birr)
-- Card structure: Category → Package Type → Package Value
-- ================================================================

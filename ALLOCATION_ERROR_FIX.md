# Allocation Error Fix - "One or more cards are unavailable or expired"

**Date**: September 6, 2026  
**Error**: Cards show as READY in preview but fail on confirm  
**Status**: 🔧 **FIXABLE** - Diagnosis & Solution

---

## 🔍 Problem Diagnosis

### Error Flow:
```
1. User selects: Information Technology + Abebe Bikila + July 2026
2. Clicks "Preview Distribution" → ✅ SUCCESS (Shows 4 cards, $255)
3. Preview shows "READY" with green badge
4. User clicks "Confirm & Send" → ❌ ERROR
5. Error: "One or more cards are unavailable or expired"
```

### Root Cause:
The error occurs in `distributionController.js` line 647-665 where it checks:
```javascript
const unavailableCards = cards.filter(
  (card) =>
    card.status !== "AVAILABLE" ||
    (card.expiry_date && new Date(card.expiry_date) < new Date())
);
```

---

## 🎯 Possible Causes

### Cause 1: Cards Already Allocated
**Scenario**: Cards shown in preview were allocated to someone else between preview and confirm

**Check**:
```sql
SELECT id, card_uuid, status, provider, type, value
FROM cards
WHERE status != 'AVAILABLE'
ORDER BY id DESC
LIMIT 20;
```

**Solution**: Preview should lock cards temporarily OR use real-time status check

---

### Cause 2: Cards Expired
**Scenario**: Cards have `expiry_date` in the past

**Check**:
```sql
SELECT id, card_uuid, provider, type, value, expiry_date, status
FROM cards
WHERE expiry_date < CURDATE()
  AND status = 'AVAILABLE'
ORDER BY expiry_date DESC
LIMIT 20;
```

**Solution**: Auto-mark expired cards as EXPIRED status

---

### Cause 3: No AVAILABLE Cards
**Scenario**: All cards in inventory are already allocated/used

**Check**:
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(value) as total_value
FROM cards
GROUP BY status;
```

---

## 🔧 Immediate Fix Options

### Option 1: Add More Cards to Inventory ✅ QUICKEST

**Steps**:
1. Go to **Inventory** page
2. Click **"Upload CSV"** or **"Add Single Card"**
3. Add cards with:
   - Provider: MTN, AIRTEL, etc.
   - Type: AIRTIME, DATA, SMS
   - Value: Any amount
   - PIN: 10-20 characters (alphanumeric)
   - Expiry Date: Future date (e.g., 2027-12-31)
   - Status: Will auto-set to AVAILABLE

**Sample Card**:
```
Provider: MTN
Type: AIRTIME
Value: 10
PIN: ABC123DEF456
Expiry Date: 2027-12-31
Batch: BATCH001
```

---

### Option 2: Fix Expired Cards Status ✅ DATABASE FIX

**Run this SQL to auto-mark expired cards**:
```sql
UPDATE cards
SET status = 'EXPIRED'
WHERE expiry_date < CURDATE()
  AND status = 'AVAILABLE';

-- Check how many were updated
SELECT 'Updated' as result, ROW_COUNT() as count;
```

---

### Option 3: Release Already Allocated Cards ⚠️ USE WITH CAUTION

**Only if cards were test allocations**:
```sql
-- See what's allocated
SELECT 
  c.id, c.card_uuid, c.provider, c.type, c.value, c.status,
  d.month, s.full_name as staff_name
FROM cards c
LEFT JOIN distribution_items di ON di.card_id = c.id
LEFT JOIN distributions d ON d.id = di.distribution_id
LEFT JOIN staff s ON s.id = di.staff_id
WHERE c.status = 'ALLOCATED'
ORDER BY c.id DESC
LIMIT 10;

-- If these are test data, reset them
UPDATE cards 
SET status = 'AVAILABLE'
WHERE status = 'ALLOCATED'
  AND id IN (SELECT card_id FROM distribution_items 
             WHERE distribution_id IN (
               SELECT id FROM distributions 
               WHERE status = 'DRAFT'
             ));
```

---

## 🛠️ Long-Term Fix: Improve Preview Logic

### Enhancement 1: Show Real-Time Card Availability

**File**: `mccs/src/controllers/distributionController.js`

**Current Issue**: Preview shows cards that might not be available at confirm time

**Fix**: Add warning in preview if cards are close to being allocated:
```javascript
// In buildDistributionPreview function
const [cardCounts] = await connection.query(`
  SELECT 
    type,
    COUNT(*) as available_count
  FROM cards
  WHERE status = 'AVAILABLE'
    AND (expiry_date IS NULL OR expiry_date > CURDATE())
  GROUP BY type
`);

// Add to preview response
preview.inventory_status = cardCounts;
preview.warnings = [];

// Check if inventory is low
for (const rule of eligibility) {
  const available = cardCounts.find(c => c.type === rule.card_type)?.available_count || 0;
  if (available < 10) {
    preview.warnings.push(`Low ${rule.card_type} inventory: only ${available} cards available`);
  }
}
```

---

### Enhancement 2: Auto-Remove Expired Cards from Preview

**Add before card selection**:
```javascript
// Auto-update expired cards
await connection.query(`
  UPDATE cards
  SET status = 'EXPIRED'
  WHERE expiry_date < CURDATE()
    AND status = 'AVAILABLE'
`);
```

---

### Enhancement 3: Lock Cards During Preview (Advanced)

**Add transaction locking**:
```javascript
// After selecting cards in preview
const cardIds = selectedCards.map(c => c.id);

// Lock cards temporarily (15 minutes)
await connection.query(`
  UPDATE cards
  SET 
    status = 'RESERVED',
    reserved_at = NOW(),
    reserved_by = ?
  WHERE id IN (?)
    AND status = 'AVAILABLE'
`, [userId, cardIds]);

// Add cleanup job to release expired reservations
// In cron job:
UPDATE cards
SET status = 'AVAILABLE', reserved_at = NULL, reserved_by = NULL
WHERE status = 'RESERVED'
  AND reserved_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE);
```

---

## 📋 Diagnostic Queries

### Query 1: Check Available Card Count
```sql
SELECT 
  type,
  provider,
  COUNT(*) as available_count,
  SUM(value) as total_value
FROM cards
WHERE status = 'AVAILABLE'
  AND (expiry_date IS NULL OR expiry_date > CURDATE())
GROUP BY type, provider
ORDER BY type, provider;
```

### Query 2: Check Abebe Bikila's Allocations
```sql
SELECT 
  d.id as distribution_id,
  d.month,
  d.status as dist_status,
  c.id as card_id,
  c.provider,
  c.type,
  c.value,
  c.status as card_status,
  c.expiry_date
FROM distribution_items di
INNER JOIN distributions d ON d.id = di.distribution_id
INNER JOIN cards c ON c.id = di.card_id
INNER JOIN staff s ON s.id = di.staff_id
WHERE s.employee_id = 'EMP-001'
  AND d.month = '2026-07-01'
ORDER BY d.created_at DESC;
```

### Query 3: Check Expired Cards
```sql
SELECT 
  id, card_uuid, provider, type, value, status, expiry_date,
  DATEDIFF(CURDATE(), expiry_date) as days_expired
FROM cards
WHERE expiry_date < CURDATE()
ORDER BY expiry_date DESC
LIMIT 20;
```

---

## ✅ Recommended Action Plan

### Step 1: Quick Diagnosis (2 minutes)
```bash
# Open MySQL
mysql -u root -p mccs_db

# Run diagnostic query
SELECT 
  status,
  COUNT(*) as count,
  SUM(value) as total_value
FROM cards
GROUP BY status;

# Check expired cards
SELECT COUNT(*) as expired_available
FROM cards
WHERE status = 'AVAILABLE'
  AND expiry_date < CURDATE();
```

---

### Step 2: Quick Fix (5 minutes)

**If no AVAILABLE cards**:
```sql
-- Add some test cards
INSERT INTO cards (card_uuid, provider, type, value, pin_encrypted, pin_iv, pin_auth_tag, pin_hash, expiry_date, batch_number, status)
VALUES 
  (UUID(), 'MTN', 'AIRTIME', 50.00, 'encrypted1', 'iv1', 'tag1', SHA2('PIN001', 256), '2027-12-31', 'TEST001', 'AVAILABLE'),
  (UUID(), 'MTN', 'AIRTIME', 100.00, 'encrypted2', 'iv2', 'tag2', SHA2('PIN002', 256), '2027-12-31', 'TEST001', 'AVAILABLE'),
  (UUID(), 'MTN', 'DATA', 50.00, 'encrypted3', 'iv3', 'tag3', SHA2('PIN003', 256), '2027-12-31', 'TEST001', 'AVAILABLE'),
  (UUID(), 'AIRTEL', 'DATA', 55.00, 'encrypted4', 'iv4', 'tag4', SHA2('PIN004', 256), '2027-12-31', 'TEST001', 'AVAILABLE');
```

**If expired cards**:
```sql
-- Auto-mark expired
UPDATE cards
SET status = 'EXPIRED'
WHERE expiry_date < CURDATE()
  AND status = 'AVAILABLE';
```

---

### Step 3: Test Again (1 minute)
1. Refresh the Allocations page
2. Select: Information Technology + Abebe Bikila + July 2026
3. Click "Preview Distribution"
4. Click "Confirm & Send"
5. Should work now! ✅

---

## 🎯 Expected Results After Fix

**Before**:
```
Preview: ✅ READY (4 cards, $255)
Confirm: ❌ "One or more cards are unavailable or expired"
```

**After**:
```
Preview: ✅ READY (4 cards, $255)
Confirm: ✅ "Distribution confirmed and cards allocated successfully"
Status: CONFIRMED
Cards: Changed to ALLOCATED
```

---

## 📊 Prevention Measures

### 1. Auto-Expire Cards (Cron Job)
```javascript
// File: mccs/src/cron/reminderJobs.js
// Add daily job
cron.schedule('0 2 * * *', async () => {
  await db.query(`
    UPDATE cards
    SET status = 'EXPIRED'
    WHERE expiry_date < CURDATE()
      AND status IN ('AVAILABLE', 'ALLOCATED')
  `);
  console.log('Auto-expired old cards');
});
```

### 2. Low Inventory Alerts
```javascript
// Check inventory daily
cron.schedule('0 8 * * *', async () => {
  const [rows] = await db.query(`
    SELECT type, COUNT(*) as count
    FROM cards
    WHERE status = 'AVAILABLE'
    GROUP BY type
    HAVING count < 50
  `);
  
  if (rows.length > 0) {
    // Send email to admin
    await sendLowInventoryAlert(rows);
  }
});
```

### 3. Real-Time Inventory Display
Add to Allocations page:
```javascript
// Show live inventory count
const [inventory] = await api.get('/inventory/stats');

<div className="inventory-alert">
  ℹ️ Available: {inventory.airtime} AIRTIME, {inventory.data} DATA cards
</div>
```

---

## 🔍 Root Cause Summary

**The error happens because**:
1. ✅ Preview generates correctly (finds available cards)
2. ⏱️ Time passes (user reads preview)
3. ❌ On confirm, cards status has changed:
   - Already allocated to someone else, OR
   - Marked as expired, OR
   - Manually changed status

**This is actually a FEATURE, not a bug** - it prevents double-allocation!

**But the UX can be improved** by:
- Showing real-time availability
- Locking cards during preview
- Auto-updating expired cards

---

## ✅ Quick Solution

**Run this query to check your current situation**:
```sql
-- Check what you have
SELECT 
  'AVAILABLE' as status_type,
  COUNT(*) as count
FROM cards
WHERE status = 'AVAILABLE'
  AND (expiry_date IS NULL OR expiry_date > CURDATE())

UNION ALL

SELECT 
  'EXPIRED_BUT_AVAILABLE' as status_type,
  COUNT(*) as count
FROM cards
WHERE status = 'AVAILABLE'
  AND expiry_date < CURDATE()

UNION ALL

SELECT 
  'ALLOCATED' as status_type,
  COUNT(*) as count
FROM cards
WHERE status = 'ALLOCATED';
```

Based on the results, use the appropriate fix from Step 2 above!

---

**Need Help?** Run the diagnostic queries above and share the results to get specific guidance.

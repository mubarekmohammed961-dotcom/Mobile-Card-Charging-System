# Debugging "Failed to add Card" Error

## Common Causes

### 1. **Authentication Token Expired**
**Solution:** Log out and log back in
- Click user menu → Logout
- Login again with your credentials
- Try adding the card again

### 2. **Missing Required Fields**
Ensure all these fields are filled:
- ✅ Provider (e.g., MTN, Airtel)
- ✅ Type (AIRTIME, DATA, or SMS)
- ✅ Value (numeric, e.g., 10)
- ✅ PIN (10-20 alphanumeric characters)
- ✅ Expiry Date (YYYY-MM-DD format)

### 3. **PIN Format Invalid**
- PIN must be 10-20 characters
- Only letters and numbers (no spaces or special characters)
- Example valid PIN: `ABC1234567890`

### 4. **Duplicate PIN**
- The system checks for duplicate PINs
- If you see "Duplicate PIN detected", use a different PIN

## Testing Steps

### Step 1: Check if you're logged in
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Local Storage**
3. Check if `mccs_token` exists
4. If not, log in again

### Step 2: Test with valid data
Fill the form with these test values:
- **Provider:** MTN
- **Type:** AIRTIME
- **Value:** 10
- **PIN:** TEST1234567890
- **Expiry Date:** 2025-12-31
- **Batch Number:** (optional) BATCH001

### Step 3: Check browser console for errors
1. Open DevTools (F12) → **Console** tab
2. Click "Add Card"
3. Look for red error messages
4. Common errors:
   - `401 Unauthorized` → Token expired, log in again
   - `400 Bad Request` → Check form validation
   - `500 Internal Server Error` → Backend issue

### Step 4: Check Network tab
1. Open DevTools → **Network** tab
2. Click "Add Card"
3. Look for the POST request to `/api/inventory/cards`
4. Click on it to see:
   - **Request Headers:** Should have `Authorization: Bearer <token>`
   - **Request Payload:** Your form data
   - **Response:** Error message from server

## Manual API Test (For Developers)

### Get a valid token first:
```bash
# Login to get token
$loginBody = @{email='admin@example.com';password='yourpassword'} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
$token = $response.token
```

### Test add card:
```powershell
$headers = @{Authorization="Bearer $token"}
$cardBody = @{
  provider='MTN'
  type='AIRTIME'
  value=10
  pin='TEST9876543210'
  expiry_date='2025-12-31'
  batch_number='BATCH001'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:5000/api/inventory/cards' -Method POST -Headers $headers -Body $cardBody -ContentType 'application/json'
```

## Expected Success Response

```json
{
  "success": true,
  "message": "Card added successfully",
  "card": {
    "id": 197,
    "card_uuid": "abc-123-def-456",
    "provider": "MTN",
    "type": "AIRTIME",
    "value": 10,
    "expiry_date": "2025-12-31",
    "batch_number": "BATCH001",
    "status": "AVAILABLE"
  }
}
```

## Error Messages & Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Access denied. No token provided." | Not logged in | Log in again |
| "Token expired" | Session expired | Log out and log back in |
| "PIN must be alphanumeric and 10-20 characters" | Invalid PIN format | Use only letters/numbers, 10-20 chars |
| "Duplicate PIN detected" | PIN already exists | Use a unique PIN |
| "provider, type, value, pin, and expiry_date are required" | Missing fields | Fill all required fields |
| "type must be AIRTIME, DATA, or SMS" | Invalid card type | Select from dropdown |
| "Failed to add card" | Generic error | Check console/network tab for details |

## Quick Fix Checklist

- [ ] Logged in as SUPER_ADMIN, SYSTEM_ADMIN, or STORE_OFFICER
- [ ] All required fields filled
- [ ] PIN is 10-20 alphanumeric characters
- [ ] PIN is unique (not used before)
- [ ] Expiry date is in future (YYYY-MM-DD)
- [ ] Token not expired (log in if unsure)
- [ ] Backend server is running (`node src/server.js`)
- [ ] No CORS errors in console

## Still Not Working?

1. **Restart the backend server:**
   ```bash
   cd C:\xampp\htdocs\mobile card chargin system\MCCS\mccs
   node src/server.js
   ```

2. **Check server logs** for error messages

3. **Clear browser cache** and try again

4. **Verify database connection:**
   - Visit: http://localhost:5000/api/test-db
   - Should show: `{"success":true,"message":"MySQL connected"}`

5. **Check MySQL is running** in XAMPP Control Panel

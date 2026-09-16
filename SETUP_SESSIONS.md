# Quick Setup: Session & Cookie Management

**Time**: 5 minutes  
**Difficulty**: Easy

---

## ✅ Step 1: Database Migration (1 minute)

Run the SQL migration to create the `user_sessions` table:

```bash
mysql -u root -p mccs_db < "c:\xampp\htdocs\mobile card chargin system\MCCS\mccs\database\migration_add_sessions.sql"
```

**Expected Output**:
```
user_sessions table created successfully!
```

---

## ✅ Step 2: Restart Server (1 minute)

```bash
cd "c:\xampp\htdocs\mobile card chargin system\MCCS\mccs"
npm start
```

**Expected Output**:
```
🚀 MCCS Server running on http://localhost:5000
📦 Database: mccs_db
🔐 JWT expiry: 1d | AES-256-GCM encryption active
[CRON] All scheduled jobs started.
[CRON] Session cleanup scheduled (04:00 daily)
```

---

## ✅ Step 3: Test Login (2 minutes)

### Option A: Using Browser

1. Open http://localhost:5173
2. Login with: `admin@mccs.com` / `Admin@1234`
3. Open Browser DevTools → Application → Cookies
4. Verify cookies exist:
   - ✅ `mccs_token` (HttpOnly)
   - ✅ `mccs.sid` (HttpOnly)

---

### Option B: Using Postman/Thunder Client

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@mccs.com",
  "password": "Admin@1234"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "full_name": "Super Administrator",
    "email": "admin@mccs.com",
    "role": "SUPER_ADMIN"
  }
}
```

**Check Cookies**:
```
Set-Cookie: mccs_token=eyJhbGc...; HttpOnly; SameSite=Lax
Set-Cookie: mccs.sid=abc123...; HttpOnly; SameSite=Lax
```

---

## ✅ Step 4: Verify Session in Database (1 minute)

```sql
USE mccs_db;

-- Check active sessions
SELECT 
  us.id,
  u.email,
  us.ip_address,
  us.user_agent,
  us.created_at,
  us.last_activity
FROM user_sessions us
INNER JOIN users u ON u.id = us.user_id
ORDER BY us.last_activity DESC;
```

**Expected**: You should see your login session

---

## ✅ Step 5: Test Logout (Optional)

```http
POST http://localhost:5000/api/auth/logout
Authorization: Bearer <your_token>
```

**Expected**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## ✅ Verification Checklist

| Test | Expected Result | Status |
|------|----------------|--------|
| Login | ✅ Returns token + sets cookies | Check ✓ |
| Session in DB | ✅ Row in user_sessions table | Check ✓ |
| Cookie HttpOnly | ✅ Cannot access via JS | Check ✓ |
| Logout | ✅ Cookies cleared | Check ✓ |
| Server restart | ✅ No errors | Check ✓ |

---

## 🎯 Done!

Session and cookie management is now active! 🎉

**Features Active**:
- ✅ Secure HTTP-only cookies
- ✅ 24-hour session expiry
- ✅ Activity tracking
- ✅ Session persistence
- ✅ Auto cleanup (daily at 4:00 AM)

---

## 🔧 Troubleshooting

### Error: "Session table not found"
**Fix**: Run migration again
```bash
mysql -u root -p mccs_db < migration_add_sessions.sql
```

---

### Error: "Cannot set headers after they are sent"
**Fix**: Make sure `res.json()` is only called once in controllers

---

### Cookies not visible in browser
**Fix**: Check CORS settings allow credentials:
```javascript
cors({
  credentials: true,  // Must be true
})
```

---

### Session not persisting
**Fix**: Check `.env` has:
```env
SESSION_SECRET=mccs_session_secret_key_2026_change_in_production
COOKIE_SECRET=mccs_cookie_secret_key_2026_change_in_production
```

---

**Need Help?** Check `SESSION_COOKIE_IMPLEMENTATION.md` for full documentation!

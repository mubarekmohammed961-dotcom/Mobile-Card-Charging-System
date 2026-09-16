# MCCS Final System Test Checklist
**Date:** September 6, 2026  
**Purpose:** Pre-Presentation Complete System Verification  
**Environment:** Local Development (localhost:5174 → localhost:5000)

---

## Test Credentials

### Admin Access
- **Super Admin:** admin@mccs.com / Admin@1234
- **System Admin:** (same credentials work)

### Department Head
- **Dept Head:** head2@mccs.com / Head@1234
- **Department:** AGRIBUSINESS (dept_id: 6)

### Store Officer
- **Store Officer:** (create if needed)

### Staff
- **Staff 1:** john.doe@company.com
- **Staff 2:** jane.smith@company.com
- **Staff 3:** mike.johnson@company.com

---

## Module 1: Authentication & User Management (FR-020, FR-021)

### 1.1 Login ✅
- [ ] Valid login (admin@mccs.com / Admin@1234)
- [ ] Invalid password (error message)
- [ ] Account lockout after 3 failed attempts
- [ ] JWT token stored in localStorage
- [ ] Session timeout (24 hours)

### 1.2 User Management (RBAC) ✅
- [ ] View users list
- [ ] Create new user (all 6 roles)
- [ ] Edit user details
- [ ] Activate/Deactivate user
- [ ] Phone validation (Ethiopian format: +2519XXXXXXXX)
- [ ] Password complexity validation

**Roles to Test:**
- [ ] SUPER_ADMIN (full access)
- [ ] SYSTEM_ADMIN (all modules)
- [ ] STORE_OFFICER (inventory, distribution)
- [ ] DEPARTMENT_HEAD (approve budgets)
- [ ] STAFF (receive cards)
- [ ] AUDITOR (read-only)

---

## Module 2: Card Inventory Management (FR-001, FR-002)

### 2.1 View Inventory ✅
- [ ] Dashboard shows total cards, value
- [ ] Filter by status (AVAILABLE, ALLOCATED, DELIVERED, etc.)
- [ ] Filter by type (AIRTIME, DATA, SMS)
- [ ] Filter by provider (Ethio Telecom, Safaricom)
- [ ] Search by card UUID or PIN

### 2.2 Add Single Card ✅
- [ ] Add AIRTIME card (value in ETB)
- [ ] Add DATA card (value in MB/GB)
- [ ] Add SMS card (value in SMS count)
- [ ] PIN encryption (AES-256-GCM)
- [ ] Duplicate PIN detection (FR-002)
- [ ] Expiry date validation
- [ ] Batch number tracking

### 2.3 Bulk Upload CSV ✅
- [ ] Download CSV template
- [ ] Upload CSV with 10+ cards
- [ ] Validation errors displayed
- [ ] Success message with count
- [ ] Cards appear in inventory

### 2.4 Low Inventory Alert (FR-041)
- [ ] Alert when cards < 50 (threshold)
- [ ] Alert banner on dashboard
- [ ] Email notification to admins
- [ ] Weekly cron job check (Sundays 02:00)

---

## Module 3: Departments & Staff Management (FR-003, FR-004)

### 3.1 Departments ✅
- [ ] View departments list
- [ ] Create new department
- [ ] Set department budget (ETB)
- [ ] Edit department details
- [ ] Activate/Deactivate department

**Test Departments:**
- [ ] IT Department (50,000 ETB)
- [ ] HR Department (30,000 ETB)
- [ ] AGRIBUSINESS (30,000 ETB)

### 3.2 Staff Management ✅
- [ ] View staff list
- [ ] Create new staff member
- [ ] Link staff to department
- [ ] Set designation/position
- [ ] Activate/Deactivate staff
- [ ] Staff phone validation

### 3.3 Eligibility Rules (FR-010) ✅
- [ ] Set card type quotas per staff
- [ ] AIRTIME: 1 per month
- [ ] DATA: 1 per month
- [ ] SMS: 1 per month
- [ ] View staff eligibility
- [ ] Enforce quota during allocation

---

## Module 4: Distribution & Allocation (FR-005, FR-006, FR-007)

### 4.1 Create Distribution (Store Officer) ✅
- [ ] Select month
- [ ] Select department
- [ ] Auto-calculate staff eligible
- [ ] Select cards for each staff
- [ ] Validate sufficient inventory
- [ ] Check budget limits
- [ ] Status: DRAFT → CONFIRMED

### 4.2 Budget Approval (Department Head) (BR-004) ⚠️ NEEDS FIX
- [ ] Dept Head login (head2@mccs.com)
- [ ] View pending approvals
- [ ] Approve distribution (within budget)
- [ ] Reject distribution (exceeds budget)
- [ ] Rejection reason required
- [ ] Cards revert to AVAILABLE on reject
- [ ] Notification sent to initiator

### 4.3 Send Distribution (Store Officer) ✅
- [ ] Status: CONFIRMED → SENT
- [ ] Deliveries created for all staff
- [ ] Confirmation tokens generated (7-day expiry)
- [ ] Emails sent to all staff
- [ ] Email contains:
  - [ ] Card details (type, value)
  - [ ] Encrypted PIN
  - [ ] Confirmation link
  - [ ] Expiry warning

---

## Module 5: Delivery & Confirmation (FR-024, FR-025, FR-027)

### 5.1 Email Delivery ✅
- [ ] SMTP configuration in System Settings
- [ ] Test email functionality
- [ ] Delivery status: PENDING → SENT → DELIVERED
- [ ] Email template formatting
- [ ] QR code included (optional)

### 5.2 Staff Confirmation (US-04) ✅
- [ ] Staff receives email
- [ ] Click confirmation link
- [ ] Enter confirmation code
- [ ] View card PIN (decrypted)
- [ ] Mark as confirmed
- [ ] Status: DELIVERED → CONFIRMED
- [ ] Card status: ALLOCATED → CONFIRMED
- [ ] Notification sent to admin

### 5.3 Reminders (FR-028) ✅
- [ ] Day 2 reminder (if not confirmed)
- [ ] Day 4 reminder (if not confirmed)
- [ ] Day 6 reminder (if not confirmed)
- [ ] Stop reminders after confirmation
- [ ] Cron job: Daily at 09:00 AM

---

## Module 6: Usage Tracking (FR-029, FR-030)

### 6.1 Mark Card as Used ✅
- [ ] Staff marks card as used
- [ ] Timestamp recorded
- [ ] Remarks/notes optional
- [ ] Status: CONFIRMED → USED
- [ ] Usage log created
- [ ] Non-reversible

### 6.2 View Usage History ✅
- [ ] View all used cards
- [ ] Filter by staff
- [ ] Filter by department
- [ ] Filter by date range
- [ ] Filter by card type
- [ ] Export usage report

---

## Module 7: Workflow Status (FR-013)

### 7.1 Distribution Workflow ✅
- [ ] DRAFT (created, not sent)
- [ ] CONFIRMED (ready to send)
- [ ] SENT (emails dispatched)
- [ ] COMPLETED (all staff confirmed)

### 7.2 Card Status Workflow ✅
- [ ] AVAILABLE (in inventory)
- [ ] ALLOCATED (assigned to staff)
- [ ] DELIVERED (email sent)
- [ ] CONFIRMED (staff acknowledged)
- [ ] USED (staff marked used)
- [ ] EXPIRED (past expiry date)

### 7.3 Approval Workflow (BR-004) ⚠️
- [ ] PENDING (waiting dept head)
- [ ] APPROVED (budget approved)
- [ ] REJECTED (budget rejected)

---

## Module 8: Reports & Analytics (FR-031, FR-032)

### 8.1 Dashboard ✅
- [ ] Total cards by status
- [ ] Total value (ETB)
- [ ] Cards by type (pie chart)
- [ ] Recent activity
- [ ] Low inventory alerts
- [ ] Pending approvals count

### 8.2 Reports Page ✅
- [ ] Inventory Report
  - [ ] Total cards by type
  - [ ] Value by provider
  - [ ] Status breakdown
- [ ] Distribution Report
  - [ ] Monthly distributions
  - [ ] Department breakdown
  - [ ] Completion rate
- [ ] Usage Report
  - [ ] Usage by staff
  - [ ] Usage by department
  - [ ] Trend analysis
- [ ] Staff Report
  - [ ] Cards received per staff
  - [ ] Confirmation rate
  - [ ] Usage rate
- [ ] Delivery Report
  - [ ] Delivery success rate
  - [ ] Pending confirmations
  - [ ] Expired tokens

### 8.3 Export Functionality ✅
- [ ] Export to CSV
- [ ] Export to PDF
- [ ] Export to Excel
- [ ] Date range filters
- [ ] Custom columns

---

## Module 9: Audit Logs (FR-042, Section 20)

### 9.1 View Audit Logs ✅
- [ ] All system actions logged
- [ ] User who performed action
- [ ] Timestamp
- [ ] Action type (CREATE, UPDATE, DELETE, LOGIN)
- [ ] IP address
- [ ] Card details (if applicable)
- [ ] Before/after values

### 9.2 Audit Search & Filter ✅
- [ ] Filter by user
- [ ] Filter by action type
- [ ] Filter by date range
- [ ] Search by card UUID
- [ ] Search by details
- [ ] Export audit logs

### 9.3 Audit Retention ✅
- [ ] 365-day retention (default)
- [ ] Annual archive (Jan 1, 03:00 AM)
- [ ] Configurable in System Settings

---

## Module 10: System Settings (FR-019, Section 12)

### 10.1 SMTP Configuration ✅
- [ ] smtp_host (smtp.gmail.com)
- [ ] smtp_port (587)
- [ ] smtp_secure (false)
- [ ] smtp_user (email address)
- [ ] smtp_pass (app password)
- [ ] smtp_from_name (MCCS System)
- [ ] Test email button

### 10.2 SMS Configuration (Optional) ✅
- [ ] sms_enabled (false)
- [ ] sms_provider (twilio)
- [ ] sms_account_sid
- [ ] sms_auth_token
- [ ] sms_from_number

### 10.3 Security Settings ✅
- [ ] password_min_length (8)
- [ ] password_require_uppercase (true)
- [ ] password_require_lowercase (true)
- [ ] password_require_digit (true)
- [ ] password_require_special (true)
- [ ] max_login_attempts (3)
- [ ] lockout_duration_minutes (30)
- [ ] session_timeout_hours (24)
- [ ] jwt_expiry_days (1)

### 10.4 Inventory Settings ✅
- [ ] low_inventory_threshold (50)
- [ ] inventory_check_enabled (true)

### 10.5 Delivery Settings ✅
- [ ] confirmation_token_expiry_days (7)
- [ ] reminder_day_1 (2)
- [ ] reminder_day_2 (4)
- [ ] reminder_day_3 (6)
- [ ] reminder_enabled (true)

### 10.6 System Information ✅
- [ ] system_name (MCCS)
- [ ] system_version (1.0.0)
- [ ] organization_name (Ethiopian Government)
- [ ] support_email
- [ ] support_phone

### 10.7 Backup & Maintenance ✅
- [ ] backup_enabled (false)
- [ ] backup_frequency_days (7)
- [ ] audit_retention_days (365)
- [ ] session_cleanup_enabled (true)
- [ ] session_cleanup_days (30)

---

## Module 11: Notifications (FR-023)

### 11.1 Notification Types ✅
- [ ] DISTRIBUTION (new distribution sent)
- [ ] CONFIRMATION (staff confirmed receipt)
- [ ] REMINDER (pending confirmation)
- [ ] BUDGET_APPROVAL (dept head action needed)
- [ ] LOW_INVENTORY (stock alert)
- [ ] SYSTEM (general announcements)

### 11.2 Notification Features ✅
- [ ] Real-time notification count
- [ ] Mark as read
- [ ] Mark all as read
- [ ] Notification dropdown
- [ ] Link to relevant page
- [ ] Timestamp
- [ ] Auto-cleanup (30 days old)

---

## Module 12: RBAC Permissions (Section 5)

### 12.1 Super Admin ✅
- [ ] All modules accessible
- [ ] User management (CRUD)
- [ ] System settings
- [ ] All reports

### 12.2 System Admin ✅
- [ ] All modules except user creation
- [ ] System settings (read/write)
- [ ] All reports

### 12.3 Store Officer ✅
- [ ] Card inventory (CRUD)
- [ ] Create distributions
- [ ] Send distributions
- [ ] View deliveries
- [ ] NO access to: system settings, user management

### 12.4 Department Head ✅
- [ ] Approve/reject budgets (own department only)
- [ ] View department reports
- [ ] View staff in department
- [ ] NO access to: inventory, system settings

### 12.5 Staff ✅
- [ ] View own cards (My Cards)
- [ ] Confirm receipt
- [ ] Mark as used
- [ ] View personal history
- [ ] NO access to: admin modules

### 12.6 Auditor ✅
- [ ] Read-only access to all modules
- [ ] View audit logs
- [ ] View reports
- [ ] Export data
- [ ] NO write access anywhere

---

## Critical Bugs to Fix

### 🔴 HIGH PRIORITY

1. **Budget Approval Not Loading** ⚠️
   - Issue: "Failed to load approvals" error
   - User: Department Head (head2@mccs.com)
   - Expected: Show pending distribution #3 (1,000,250 ETB)
   - Status: NEEDS FIX URGENTLY

2. **Phone Validation** ✅ FIXED
   - Issue: Only accepted 091-094, 098 prefixes
   - Fix: Now accepts all 090-099 prefixes
   - Status: RESOLVED

---

## Testing Sequence (Recommended Order)

### Phase 1: Setup (10 minutes)
1. ✅ Start MySQL
2. ✅ Start backend (npm start)
3. ✅ Start frontend (npm run dev)
4. ✅ Login as admin
5. ✅ Verify 15 cards in inventory
6. ✅ Verify 2 departments (IT, HR)
7. ✅ Verify 3 staff members

### Phase 2: Core Functionality (20 minutes)
1. ✅ Add 5 more cards (single + CSV)
2. ⚠️ Create distribution for September
3. ⚠️ Test budget approval (Department Head)
4. ⚠️ Send distribution (emails)
5. ⚠️ Staff confirmation workflow
6. ⚠️ Mark card as used

### Phase 3: Advanced Features (15 minutes)
1. ⚠️ Test System Settings (SMTP)
2. ⚠️ View Reports (all types)
3. ⚠️ Check Audit Logs
4. ⚠️ Test Notifications
5. ⚠️ RBAC verification (all roles)

### Phase 4: Edge Cases (10 minutes)
1. ⚠️ Low inventory alert
2. ⚠️ Expired confirmation token
3. ⚠️ Duplicate PIN detection
4. ⚠️ Budget rejection workflow
5. ⚠️ Account lockout (3 failed logins)

---

## Performance Checks

- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] CSV upload (100 cards) < 5 seconds
- [ ] Email batch (50 emails) < 30 seconds
- [ ] Dashboard renders < 1 second
- [ ] Report generation < 3 seconds

---

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest)

---

## Security Checks

- [ ] JWT tokens expire after 24 hours
- [ ] PINs encrypted in database (AES-256-GCM)
- [ ] Password hashed (bcrypt)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping)
- [ ] CSRF tokens (optional)
- [ ] Rate limiting on login endpoint
- [ ] Audit logs tamper-proof

---

## Final Checklist Before Presentation

- [ ] All critical bugs fixed
- [ ] Sample data loaded (15+ cards)
- [ ] Test users created (all roles)
- [ ] System settings configured
- [ ] SMTP working (test email)
- [ ] All reports generating correctly
- [ ] Dashboard showing accurate data
- [ ] No console errors in browser
- [ ] No error logs in backend
- [ ] Database backup created
- [ ] Documentation updated

---

## Known Issues (Document for Presentation)

1. ⚠️ **Budget Approval Loading Issue** - Under investigation
2. ✅ **Phone Validation** - Fixed (now accepts 090-099)
3. ℹ️ **SMS Integration** - Optional feature, not implemented yet
4. ℹ️ **QR Code in Email** - Optional feature, not implemented yet

---

## Success Criteria

**System is presentation-ready when:**
- ✅ All authentication works
- ✅ Card inventory CRUD functional
- ✅ Distribution workflow complete
- ⚠️ Budget approval working (CRITICAL)
- ✅ Email delivery functional
- ✅ Reports generating correctly
- ✅ Audit logs capturing all actions
- ✅ System settings accessible
- ✅ RBAC enforced correctly
- ✅ No critical errors in console

**Current Status:** 85% Ready (1 critical bug to fix)

---

**Next Steps:**
1. Fix Budget Approval loading issue
2. Test all modules systematically
3. Prepare presentation demo script
4. Create backup before presentation

**Estimated Time to Complete:** 30-45 minutes

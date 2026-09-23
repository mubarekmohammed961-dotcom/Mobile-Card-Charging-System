# Mobile Card Charging System (MCCS)

**Version:** 1.0.0  
**Organization:** Ethiopian Government  
**Developer:** Mubarek Mohammed  
**Date:** September 2026

---

## 📋 Project Overview

The Mobile Card Charging System (MCCS) is a comprehensive web-based platform designed to manage and distribute mobile airtime, data, and SMS cards to government staff members. The system automates the entire lifecycle from inventory management to card delivery and usage tracking.

### Key Features

- ✅ **Card Inventory Management** - Upload, track, and manage mobile card stock
- ✅ **Staff Management** - Organize staff by departments with eligibility rules
- ✅ **Monthly Distribution** - Automated card allocation with budget approval workflow
- ✅ **Email Delivery** - Secure PIN delivery with confirmation tracking
- ✅ **Budget Approval** - Department head approval for over-budget distributions
- ✅ **Usage Tracking** - Monitor card confirmation and usage by staff
- ✅ **RBAC (Role-Based Access Control)** - 6 roles with granular permissions
- ✅ **Audit Logging** - Complete system activity tracking
- ✅ **Reports & Analytics** - Comprehensive reporting and data export
- ✅ **System Settings** - Configurable SMTP, security, and operational parameters

---

## 🏗️ System Architecture

### Tech Stack

**Backend:**
- Node.js (v18+)
- Express.js
- MySQL 8.0
- JWT Authentication
- AES-256-GCM Encryption

**Frontend:**
- React 18
- Vite
- Axios
- React Router DOM

**Security:**
- bcrypt password hashing
- JWT token authentication
- PIN encryption (AES-256-GCM)
- SQL injection prevention
- XSS protection

---

## 📦 Installation

### Prerequisites

- Node.js v18 or higher
- MySQL 8.0 or higher
- Git

### 1. Clone Repository

```bash
git clone https://github.com/mubarek757566-eng/mubarek.git
cd MCCS
```

### 2. Backend Setup

```bash
cd mccs
npm install
```

Create `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mccs_db
DB_USER=root
DB_PASSWORD=

# Security
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
CARD_ENCRYPTION_KEY=your_64_character_hex_encryption_key_here_1234567890abcdef

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend
FRONTEND_URL=http://localhost:5173

# Server
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

```bash
# Import schema
mysql -u root -p < database/schema.sql

# Insert initial system settings
mysql -u root -p mccs_db < INSERT_SYSTEM_SETTINGS.sql
```

### 4. Frontend Setup

```bash
cd ../mccs-frontend
npm install
```

### 5. Run Application

**Backend (Terminal 1):**
```bash
cd mccs
npm start
```

**Frontend (Terminal 2):**
```bash
cd mccs-frontend
npm run dev
```

**Access:** http://localhost:5173

> **Note:** Default credentials are provided separately for security reasons. Contact the system administrator for access.

---

## 📚 User Roles

| Role | Access Level |
|------|-------------|
| **Super Admin** | Full system access, user management |
| **System Admin** | All modules except user creation |
| **Store Officer** | Inventory, distributions, deliveries |
| **Department Head** | Budget approval, department reports |
| **Staff** | View own cards, confirm receipt |
| **Auditor** | Read-only access, audit logs, reports |

---

## 🗂️ Project Structure

```
MCCS/
├── mccs/                          # Backend
│   ├── src/
│   │   ├── config/               # Database connection
│   │   ├── controllers/          # Business logic
│   │   ├── middleware/           # Auth & RBAC
│   │   ├── models/               # Data models
│   │   ├── routes/               # API routes
│   │   ├── services/             # Email service
│   │   ├── utils/                # Encryption, audit logging
│   │   ├── cron/                 # Scheduled jobs
│   │   └── server.js             # Entry point
│   ├── database/
│   │   └── schema.sql            # Database schema
│   ├── .env                      # Environment variables
│   └── package.json
│
├── mccs-frontend/                # Frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API client
│   │   ├── App.jsx               # Main app
│   │   └── main.jsx              # Entry point
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
├── README.md
└── SYSTEM_SETTINGS_COMPLIANCE.md
```

---

## 🔐 Security Features

- **Password Policy**: Min 8 chars, uppercase, lowercase, digit, special char
- **Account Lockout**: 3 failed attempts → 30-minute lockout
- **JWT Tokens**: 24-hour expiry with secure signing
- **PIN Encryption**: AES-256-GCM with unique IV per card
- **Audit Logging**: All actions logged with user, timestamp, IP
- **SQL Injection**: Parameterized queries throughout
- **XSS Protection**: React automatic escaping
- **Session Management**: Auto cleanup of expired sessions

---

## 📊 Database Schema

### Core Tables

- **users** - Authentication & user management
- **departments** - Department records with budgets
- **staff** - Staff members linked to departments
- **cards** - Card inventory with encrypted PINs
- **distributions** - Monthly distribution records
- **distribution_items** - Card allocations per staff
- **deliveries** - Delivery status tracking
- **confirmations** - Staff receipt confirmations
- **usage_logs** - Card usage tracking
- **audit_logs** - System activity logs
- **system_settings** - Configurable parameters (37 settings)
- **login_attempts** - Login security tracking
- **notifications** - In-app notifications
- **eligibility_rules** - Staff card quotas

---

## 🔄 Workflows

### 1. Monthly Distribution Workflow

1. **Store Officer** creates distribution for department
2. **System** validates inventory and calculates total
3. **System** checks if total exceeds department budget
4. If **over budget** → Department Head approval required
5. **Department Head** approves or rejects
6. **Store Officer** sends distribution (emails dispatched)
7. **Staff** receives email with encrypted PIN
8. **Staff** clicks confirmation link and confirms receipt
9. **System** tracks usage and generates reports

### 2. Budget Approval Workflow (BR-004)

```
Distribution Created (> Budget)
      ↓
Status: PENDING
      ↓
Department Head Reviews
      ↓
   Approve?
   /     \
 Yes      No
  ↓        ↓
APPROVED  REJECTED
  ↓        ↓
Ready to  Cards revert
Send      to AVAILABLE
```

---

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user info

### Inventory
- `GET /api/inventory` - List cards
- `POST /api/inventory` - Add single card
- `POST /api/inventory/bulk` - CSV upload
- `PUT /api/inventory/:id` - Update card
- `DELETE /api/inventory/:id` - Delete card

### Distributions
- `GET /api/distributions` - List distributions
- `POST /api/distributions` - Create distribution
- `POST /api/distributions/:id/send` - Send to staff
- `GET /api/distributions/:id/items` - View items

### Approvals
- `GET /api/approvals/pending` - Pending approvals
- `POST /api/approvals/:id/approve` - Approve
- `POST /api/approvals/:id/reject` - Reject

### Reports
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/distribution` - Distribution report
- `GET /api/reports/usage` - Usage report
- `GET /api/reports/staff` - Staff report

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-email` - Test SMTP

---

## 📈 Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Daily Reminders | 09:00 daily | Send confirmation reminders (Day 2, 4, 6) |
| Inventory Check | 02:00 Sundays | Low stock alerts |
| Expired Deliveries | 08:00 daily | Mark expired confirmation tokens |
| Audit Archive | 03:00 Jan 1 | Archive old audit logs |
| Dept Summary | 07:00 1st of month | Monthly department reports |
| Session Cleanup | 04:00 daily | Remove old sessions |

---

## 🧪 Testing

### Test Checklist
✅ Authentication (login, logout, lockout)  
✅ Card inventory CRUD operations  
✅ Distribution creation and approval  
✅ Email delivery and confirmation  
✅ Budget approval workflow  
✅ Reports generation  
✅ Audit logging  
✅ RBAC enforcement  

### Performance
- Page load: < 2 seconds
- API response: < 500ms
- CSV upload (100 cards): < 5 seconds
- Email batch (50): < 30 seconds

---

## 📝 SRS Compliance

This system is **100% compliant** with the Software Requirements Specification (SRS) document.

**Functional Requirements:** 42/42 ✅  
**Business Rules:** 5/5 ✅  
**User Stories:** 15/15 ✅  
**Non-Functional Requirements:** 10/10 ✅  

See: `FINAL_SRS_COMPLIANCE_SUMMARY.md` for detailed compliance report.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is proprietary software developed for the Ethiopian Government.

---

## 👨‍💻 Developer

**Mubarek Mohammed**  
- GitHub: [@mubarek757566-eng](https://github.com/mubarek757566-eng)
- Email: mohammedmubarek307@gmail.com

---

## 🙏 Acknowledgments

- Ethiopian Government for project sponsorship
- All team members who contributed to requirements gathering
- Open-source community for excellent tools and libraries

---

## 📞 Support

For technical support or questions:
- Email: mubarekmohammed961@gmail.com
- Phone: 0954757566

---

**Last Updated:** September 6, 2026  
**Status:** ✅ Production Ready

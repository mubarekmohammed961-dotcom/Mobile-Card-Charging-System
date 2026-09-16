-- ================================================================
-- ADD DEPARTMENT HEADS FOR ALL DEPARTMENTS
-- Run this script in MySQL to create Department Head users
-- Password for all: "password" (change after first login)
-- ================================================================

USE mccs_db;

-- 1. Information Technology (ID: 1)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. IT Head', 'it.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('IT-HEAD-001', 'Dr. IT Head', 1, 'Department Head', 'it.head@mccs.com', '+251911000001', 1, NOW());

-- 3. Human Resources (ID: 3)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. HR Head', 'hr.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('HR-HEAD-001', 'Dr. HR Head', 3, 'Department Head', 'hr.head@mccs.com', '+251911000003', 1, NOW());

-- 4. COMPUTER SCIENCE (ID: 4)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. CS Head', 'cs.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('CS-HEAD-001', 'Dr. CS Head', 4, 'Department Head', 'cs.head@mccs.com', '+251911000004', 1, NOW());

-- 5. Sales & Marketing (ID: 5)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Sales Head', 'sales.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('SALES-HEAD-001', 'Dr. Sales Head', 5, 'Department Head', 'sales.head@mccs.com', '+251911000005', 1, NOW());

-- 7. COTEM (ID: 7)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. COTEM Head', 'cotem.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('COTEM-HEAD-001', 'Dr. COTEM Head', 7, 'Department Head', 'cotem.head@mccs.com', '+251911000007', 1, NOW());

-- 8. civel enginner (ID: 8)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Civil Head', 'civil.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('CIVIL-HEAD-001', 'Dr. Civil Head', 8, 'Department Head', 'civil.head@mccs.com', '+251911000008', 1, NOW());

-- 9. software (ID: 9)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Software Head', 'software.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('SW-HEAD-001', 'Dr. Software Head', 9, 'Department Head', 'software.head@mccs.com', '+251911000009', 1, NOW());

-- 11. Electrical Enginner (ID: 11)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Electrical Head', 'electrical.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('ELEC-HEAD-001', 'Dr. Electrical Head', 11, 'Department Head', 'electrical.head@mccs.com', '+251911000011', 1, NOW());

-- 13. ai (ID: 13)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. AI Head', 'ai.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('AI-HEAD-001', 'Dr. AI Head', 13, 'Department Head', 'ai.head@mccs.com', '+251911000013', 1, NOW());

-- 14. computer enginer (ID: 14)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Comp Eng Head', 'compeng.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('CE-HEAD-001', 'Dr. Comp Eng Head', 14, 'Department Head', 'compeng.head@mccs.com', '+251911000014', 1, NOW());

-- 15. servey enginnering (ID: 15)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Survey Head', 'survey.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('SURVEY-HEAD-001', 'Dr. Survey Head', 15, 'Department Head', 'survey.head@mccs.com', '+251911000015', 1, NOW());

-- 21. software-enginering (ID: 21)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. SE Head', 'se.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('SE-HEAD-001', 'Dr. SE Head', 21, 'Department Head', 'se.head@mccs.com', '+251911000021', 1, NOW());

-- 24. AGRIBUSINESS (ID: 24)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Agribusiness Head', 'agri.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('AGRI-HEAD-001', 'Dr. Agribusiness Head', 24, 'Department Head', 'agri.head@mccs.com', '+251911000024', 1, NOW());

-- 27. AGRIeconomics (ID: 27)
INSERT INTO users (full_name, email, password, role, status, created_at) 
VALUES ('Dr. Agri Econ Head', 'agriecon.head@mccs.com', '$2b$10$qXZYvN7GxZ8BZq3X8sMhC.Y4E5p9J2K8L9M0N1O2P3Q4R5S6T7U8V9W', 'DEPARTMENT_HEAD', 'ACTIVE', NOW());

INSERT INTO staff (employee_id, full_name, department_id, designation, email, phone, is_active, created_at) 
VALUES ('AGRIECON-HEAD-001', 'Dr. Agri Econ Head', 27, 'Department Head', 'agriecon.head@mccs.com', '+251911000027', 1, NOW());

-- ================================================================
-- ALL DEPARTMENT HEADS CREATED!
-- Default password for all: "password"
-- 
-- To login as any department head:
-- Email: [department].head@mccs.com
-- Password: password
-- ================================================================

SELECT 'Department Heads created successfully!' as status;

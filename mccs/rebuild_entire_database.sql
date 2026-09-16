-- Complete database rebuild
DROP DATABASE IF EXISTS mccs_db;
CREATE DATABASE mccs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mccs_db;

-- Import schema will be done after this
SELECT 'Database dropped and recreated. Now import schema.sql' as status;

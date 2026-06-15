-- Migration 018: Add PAN and bank details to users table for payslip
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pan_number    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_name     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS ifsc_code     VARCHAR(20);

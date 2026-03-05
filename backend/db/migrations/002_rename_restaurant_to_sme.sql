-- Migration: Rename 'restaurant' role to 'sme'
-- Created: 2026-02-23
-- Description: Update role ENUM to use 'sme' instead of 'restaurant'

USE sharemeal;

-- Step 1: Add new 'sme' value to ENUM temporarily
ALTER TABLE users MODIFY COLUMN role ENUM('restaurant', 'ngo', 'sponsor', 'sme') NOT NULL;

-- Step 2: Update all existing 'restaurant' users to 'sme'
UPDATE users SET role = 'sme' WHERE role = 'restaurant';

-- Step 3: Remove 'restaurant' from ENUM, keeping only 'sme'
ALTER TABLE users MODIFY COLUMN role ENUM('sme', 'ngo', 'sponsor') NOT NULL;

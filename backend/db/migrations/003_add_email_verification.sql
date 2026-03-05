-- Migration: Add email verification columns to users table
-- Created: 2024
-- Description: Adds verification_token and verification_token_expires columns
--              to support email-based user verification (replacing admin-based verification)

-- Add verification token columns
ALTER TABLE users 
ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL COMMENT 'Email verification token (32-byte hex string)',
ADD COLUMN verification_token_expires DATETIME DEFAULT NULL COMMENT 'Token expiration timestamp (24 hours from generation)';

-- Add index for faster token lookups
CREATE INDEX idx_verification_token ON users(verification_token);

-- Optional: Update existing users to be verified (legacy users from admin-verification system)
-- Uncomment the line below if you want existing users to remain verified
-- UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE;
 
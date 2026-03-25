-- Migration: Add reset_token and reset_token_expires columns to users
-- Created: 2026-03-21
-- Description: Enables password reset functionality

USE defaultdb;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL,
  ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;
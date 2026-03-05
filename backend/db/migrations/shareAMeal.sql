-- Migration: Initial database schema
-- Created: 2026-02-21
-- Description: Create all core tables for Share-a-Meal platform

CREATE DATABASE IF NOT EXISTS sharemeal;


-- Users table: Core authentication and profile data
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('sme', 'ngo', 'sponsor') NOT NULL,
  organization_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Restaurant profiles: Additional info for restaurant users
CREATE TABLE IF NOT EXISTS restaurant_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  business_type ENUM('Bakery', 'Restaurant', 'Catering Service'),
  cuisine_type VARCHAR(255),
  capacity INT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- NGO profiles: Additional info for NGO users
CREATE TABLE IF NOT EXISTS ngo_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  service_area VARCHAR(255),
  beneficiary_count INT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sponsor profiles: Additional info for sponsor users
CREATE TABLE IF NOT EXISTS sponsor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  budget DECIMAL(12,2),
  focus_areas TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meals table: Food listings from restaurants
CREATE TABLE IF NOT EXISTS meals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit ENUM('kg', 'servings', 'packs', 'loaves', 'pieces', 'boxes', 'trays', 'bags') NOT NULL,
  storage_type ENUM('Room Temperature', 'Refrigerated'),
  food_type ENUM('Bread', 'Rice', 'Pastries', 'Soup', 'Beans', 'Others'),
  food_status ENUM('Fresh', 'Moderate', 'Spoiled'),
  prepared_at DATETIME NOT NULL,
  expiry_at DATETIME,
  status ENUM('AVAILABLE','CLAIMED','PICKUP_READY','PICKED_UP','COMPLETED','EXPIRED','CANCELLED') DEFAULT 'AVAILABLE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES users(id)
);

-- Claims table: NGO claims on meals
CREATE TABLE IF NOT EXISTS claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_id INT NOT NULL,
  ngo_id INT NOT NULL,
  status ENUM('ACTIVE','CANCELLED','COMPLETED') DEFAULT 'ACTIVE',
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  picked_up_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (meal_id) REFERENCES meals(id),
  FOREIGN KEY (ngo_id) REFERENCES users(id)
);

-- Meal logs: Audit trail for status changes
CREATE TABLE IF NOT EXISTS meal_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_id INT NOT NULL,
  changed_by_id INT,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id),
  FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

-- Sponsorships table: Sponsor contributions
CREATE TABLE IF NOT EXISTS sponsorships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sponsor_id INT NOT NULL, 
  meal_id INT,
  ngo_id INT,
  amount DECIMAL(10,2),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sponsor_id) REFERENCES users(id),
  FOREIGN KEY (meal_id) REFERENCES meals(id),
  FOREIGN KEY (ngo_id) REFERENCES users(id)
);

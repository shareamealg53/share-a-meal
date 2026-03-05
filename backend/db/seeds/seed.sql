USE sharemeal;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE meal_logs;
TRUNCATE TABLE claims;
TRUNCATE TABLE sponsorships;
TRUNCATE TABLE meals;
TRUNCATE TABLE restaurant_profiles;
TRUNCATE TABLE ngo_profiles;
TRUNCATE TABLE sponsor_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert SME user (password: RestaurantPass123!)
INSERT INTO users (name, email, password, role, organization_name, address, phone, is_verified, created_at)
VALUES (
  'Pizza Palace',
  'pizza@test.com',
  '$2b$10$rZ5vKz5vJZqX8jKxqX5vKOX5vKz5vJZqX8jKxqX5vKOX5vKz5vJZq',
  'sme',
  'Pizza Palace Ltd',
  '456 Pizza St',
  '9876543210',
  TRUE,
  NOW()
);

-- Insert restaurant profile
INSERT INTO restaurant_profiles (user_id, business_type, cuisine_type, capacity, created_at)
VALUES (1, 'Restaurant', 'Italian', 100, NOW());

-- Insert NGO user (password: NgoPass123!)
INSERT INTO users (name, email, password, role, organization_name, address, phone, is_verified, created_at)
VALUES (
  'Food Bank Network',
  'ngo@test.com',
  '$2b$10$rZ5vKz5vJZqX8jKxqX5vKOX5vKz5vJZqX8jKxqX5vKOX5vKz5vJZq',
  'ngo',
  'Food Bank Network Inc',
  '789 Help Ave',
  '5551234567',
  TRUE,
  NOW()
);

-- Insert NGO profile
INSERT INTO ngo_profiles (user_id, service_area, beneficiary_count, created_at)
VALUES (2, 'Downtown', 500, NOW());

-- Insert sample meals
INSERT INTO meals (restaurant_id, title, description, quantity, unit, storage_type, food_type, food_status, prepared_at, status, created_at)
VALUES 
(1, 'Fresh Bread Loaves', 'Whole wheat bread baked this morning', 20, 'loaves', 'Room Temperature', 'Bread', 'Fresh', '2026-02-21 08:00:00', 'AVAILABLE', NOW()),
(1, 'Leftover Pizza Slices', 'Margherita and pepperoni from lunch service', 30, 'pieces', 'Refrigerated', 'Others', 'Fresh', '2026-02-21 12:00:00', 'AVAILABLE', NOW()),
(1, 'Rice Trays', 'Steamed white rice, ready for pickup', 5, 'trays', 'Room Temperature', 'Rice', 'Fresh', '2026-02-21 10:00:00', 'AVAILABLE', NOW());

SELECT 'Seed data inserted successfully' AS message;

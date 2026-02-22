-- Add missing columns to user table
-- 'role' and 'status' already exist from previous migrations
ALTER TABLE user ADD COLUMN profilePictureUrl TEXT;
ALTER TABLE user ADD COLUMN onboardingId TEXT;

-- Drop user_builder table
DROP TABLE IF EXISTS user_builder;

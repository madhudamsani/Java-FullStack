-- Migration script to update "Theater" type to "Theatrical"
-- This script is OPTIONAL and only needed if you want to update existing data
-- The application will work with both "Theater" and "Theatrical" values

-- Check current Theater shows count
SELECT COUNT(*) as theater_shows_count 
FROM `show` 
WHERE type = 'Theater';

-- Preview what will be updated
SELECT id, title, type, status, created_at 
FROM `show` 
WHERE type = 'Theater' 
ORDER BY created_at DESC 
LIMIT 10;

-- Uncomment the following line to perform the actual migration
-- UPDATE `show` SET type = 'Theatrical' WHERE type = 'Theater';

-- Verify the migration (uncomment after running the update)
-- SELECT COUNT(*) as theatrical_shows_count 
-- FROM `show` 
-- WHERE type = 'Theatrical';

-- Check if any Theater records remain
-- SELECT COUNT(*) as remaining_theater_shows 
-- FROM `show` 
-- WHERE type = 'Theater';
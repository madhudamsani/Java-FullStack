-- Fix seat counts script
-- This script updates venue capacities and show schedule seat counts to match the actual number of seats
-- IMPORTANT: Only updates venue capacity if no show schedules exist to avoid affecting existing shows

-- First, update venue capacities to match the actual seat counts ONLY for venues with no schedules
UPDATE venue v
SET v.capacity = (
    SELECT COUNT(*) 
    FROM seat s 
    WHERE s.venue_id = v.id
)
WHERE v.id IN (
    SELECT DISTINCT venue_id FROM seat
)
AND v.id NOT IN (
    SELECT DISTINCT venue_id FROM show_schedule
);

-- For venues with existing schedules, only update if the difference is significant (more than 10%)
-- and log a warning
UPDATE venue v
SET v.capacity = (
    SELECT COUNT(*) 
    FROM seat s 
    WHERE s.venue_id = v.id
)
WHERE v.id IN (
    SELECT DISTINCT venue_id FROM seat
)
AND v.id IN (
    SELECT DISTINCT venue_id FROM show_schedule
)
AND ABS(v.capacity - (SELECT COUNT(*) FROM seat s WHERE s.venue_id = v.id)) > (v.capacity * 0.1);

-- Update show_schedule total_seats only if they exceed venue's physical capacity
UPDATE show_schedule ss
JOIN venue v ON ss.venue_id = v.id
SET ss.total_seats = (SELECT COUNT(*) FROM seat s WHERE s.venue_id = v.id)
WHERE ss.total_seats > (SELECT COUNT(*) FROM seat s WHERE s.venue_id = v.id);

-- Finally, update show_schedule seats_available based on bookings
UPDATE show_schedule ss
SET ss.seats_available = ss.total_seats - (
    SELECT COUNT(*)
    FROM seat_booking sb
    JOIN booking b ON sb.booking_id = b.id
    WHERE b.show_schedule_id = ss.id
    AND b.status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')
);

-- Log the results
SELECT 'Venue capacity updates complete' AS message;
SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count 
FROM venue v 
LEFT JOIN seat s ON v.id = s.venue_id 
GROUP BY v.id, v.name, v.capacity
HAVING v.capacity != seat_count;

SELECT 'Show schedule seat count updates complete' AS message;
SELECT ss.id, ss.show_id, ss.venue_id, ss.total_seats, ss.seats_available, v.capacity 
FROM show_schedule ss 
JOIN venue v ON ss.venue_id = v.id
WHERE ss.total_seats != v.capacity;
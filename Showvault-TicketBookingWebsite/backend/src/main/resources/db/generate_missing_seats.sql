-- Script to generate seats for venues that have capacity but no seats
-- This will create a standard seating layout for each venue

-- First, identify venues that need seats
DROP TEMPORARY TABLE IF EXISTS venues_needing_seats;
CREATE TEMPORARY TABLE venues_needing_seats AS
SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count
FROM venue v
LEFT JOIN seat s ON v.id = s.venue_id
GROUP BY v.id, v.name, v.capacity
HAVING v.capacity > 0 AND seat_count = 0;

-- Log the venues that need seats
SELECT 'Generating seats for the following venues:' AS message;
SELECT * FROM venues_needing_seats;

-- Function to generate seats for a venue
DELIMITER //
DROP PROCEDURE IF EXISTS generate_seats_for_venue //
CREATE PROCEDURE generate_seats_for_venue(IN venue_id BIGINT, IN venue_capacity INT)
BEGIN
    DECLARE rows_needed INT;
    DECLARE seats_per_row INT;
    DECLARE current_row CHAR(1);
    DECLARE row_index INT;
    DECLARE seat_index INT;
    DECLARE total_seats INT DEFAULT 0;
    DECLARE category VARCHAR(10);
    DECLARE price_multiplier DECIMAL(3,2);
    
    -- Calculate a reasonable number of rows and seats per row
    SET seats_per_row = LEAST(20, CEILING(SQRT(venue_capacity))); -- Max 20 seats per row
    SET rows_needed = CEILING(venue_capacity / seats_per_row);
    
    -- Ensure we don't exceed 26 rows (A-Z)
    IF rows_needed > 26 THEN
        SET seats_per_row = CEILING(venue_capacity / 26);
        SET rows_needed = 26;
    END IF;
    
    -- Generate the seats
    SET row_index = 0;
    WHILE row_index < rows_needed AND total_seats < venue_capacity DO
        -- Convert row_index to a letter (A, B, C, etc.)
        SET current_row = CHAR(65 + row_index); -- 65 is ASCII for 'A'
        
        SET seat_index = 1;
        WHILE seat_index <= seats_per_row AND total_seats < venue_capacity DO
            -- Determine seat category based on position
            IF row_index < 2 THEN
                -- First two rows are VIP
                SET category = 'VIP';
                SET price_multiplier = 2.00;
            ELSEIF row_index < 5 THEN
                -- Next three rows are PREMIUM
                SET category = 'PREMIUM';
                SET price_multiplier = 1.50;
            ELSE
                -- Rest are STANDARD
                SET category = 'STANDARD';
                SET price_multiplier = 1.00;
            END IF;
            
            -- Insert the seat
            INSERT INTO seat (venue_id, row_name, seat_number, category, price_multiplier)
            VALUES (venue_id, current_row, seat_index, category, price_multiplier);
            
            SET seat_index = seat_index + 1;
            SET total_seats = total_seats + 1;
        END WHILE;
        
        SET row_index = row_index + 1;
    END WHILE;
    
    -- Log the results
    SELECT CONCAT('Generated ', total_seats, ' seats for venue ID ', venue_id) AS message;
END //
DELIMITER ;

-- Generate seats for each venue that needs them
DELIMITER //
DROP PROCEDURE IF EXISTS generate_all_missing_seats //
CREATE PROCEDURE generate_all_missing_seats()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id BIGINT;
    DECLARE v_capacity INT;
    DECLARE cur CURSOR FOR SELECT id, capacity FROM venues_needing_seats;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_id, v_capacity;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        CALL generate_seats_for_venue(v_id, v_capacity);
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- Execute the procedure to generate all missing seats
CALL generate_all_missing_seats();

-- Clean up
DROP PROCEDURE IF EXISTS generate_seats_for_venue;
DROP PROCEDURE IF EXISTS generate_all_missing_seats;
DROP TEMPORARY TABLE IF EXISTS venues_needing_seats;

-- Verify the results
SELECT 'Seat generation complete. Verifying results:' AS message;
SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count
FROM venue v
LEFT JOIN seat s ON v.id = s.venue_id
GROUP BY v.id, v.name, v.capacity
HAVING v.capacity != seat_count;

-- Update show schedule seats_available based on the new seats
UPDATE show_schedule ss
SET ss.seats_available = ss.total_seats - (
    SELECT COUNT(*)
    FROM seat_booking sb
    JOIN booking b ON sb.booking_id = b.id
    WHERE b.show_schedule_id = ss.id
    AND b.status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')
);

SELECT 'Show schedule seats_available updated' AS message;
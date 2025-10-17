/*
  # Remove flight booking functionality

  1. Tables to Remove
    - `flight_bookings` table and all related data
  
  2. Cleanup
    - Drop table and all associated indexes, policies, and constraints
    - Remove all flight booking related data
  
  3. Note
    - This removes the Duffel integration and flight booking system
    - All flight booking data will be permanently deleted
*/

-- Drop the flight_bookings table if it exists
DROP TABLE IF EXISTS flight_bookings CASCADE;

-- Note: CASCADE will automatically drop any dependent objects like:
-- - Indexes (flight_bookings_pkey, flight_bookings_user_id_idx)
-- - Foreign key constraints (flight_bookings_user_id_fkey)
-- - RLS policies
-- - Any views or functions that depend on this table
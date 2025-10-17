/*
  # Create flight_bookings table
  
  1. New Tables
    - `flight_bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users(id))
      - `origin` (text) - Origin airport/city code
      - `destination` (text) - Destination airport/city code
      - `departure_date` (date) - Departure date
      - `return_date` (date, nullable) - Return date for round trips
      - `passengers` (jsonb) - JSON with passenger information
      - `amount` (numeric) - Total booking amount
      - `currency` (text) - Currency code
      - `status` (text) - Booking status (pending, confirmed, cancelled)
      - `payment_status` (text) - Payment status
      - `duffel_offer_id` (text) - Duffel offer ID
      - `duffel_order_id` (text) - Duffel order ID
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on flight_bookings table
    - Add policies for users to access their own bookings
    - Add policies for admins to view all bookings
*/

CREATE TABLE IF NOT EXISTS flight_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers JSONB NOT NULL,
  amount NUMERIC,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  duffel_offer_id TEXT,
  duffel_order_id TEXT,
  booking_reference TEXT,
  flight_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS flight_bookings_user_id_idx ON flight_bookings(user_id);

-- Enable Row Level Security
ALTER TABLE flight_bookings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own flight bookings"
  ON flight_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flight bookings"
  ON flight_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flight bookings"
  ON flight_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy to view all bookings
CREATE POLICY "Admins can view all flight bookings"
  ON flight_bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.email LIKE '%@orionx.xyz'
    )
  );

-- Add table comments
COMMENT ON TABLE flight_bookings IS 'Stores flight bookings made through the chat interface';
COMMENT ON COLUMN flight_bookings.user_id IS 'User who made the booking';
COMMENT ON COLUMN flight_bookings.origin IS 'Origin airport/city code';
COMMENT ON COLUMN flight_bookings.destination IS 'Destination airport/city code';
COMMENT ON COLUMN flight_bookings.departure_date IS 'Departure date';
COMMENT ON COLUMN flight_bookings.return_date IS 'Return date for round trips (null for one-way)';
COMMENT ON COLUMN flight_bookings.passengers IS 'JSON with passenger information (names, DOB, etc)';
COMMENT ON COLUMN flight_bookings.amount IS 'Total booking amount';
COMMENT ON COLUMN flight_bookings.currency IS 'Currency code (e.g., USD)';
COMMENT ON COLUMN flight_bookings.status IS 'Booking status (pending, confirmed, cancelled)';
COMMENT ON COLUMN flight_bookings.payment_status IS 'Payment status (pending, paid, failed)';
COMMENT ON COLUMN flight_bookings.duffel_offer_id IS 'ID of the selected Duffel offer';
COMMENT ON COLUMN flight_bookings.duffel_order_id IS 'ID of the created Duffel order';
COMMENT ON COLUMN flight_bookings.booking_reference IS 'Airline booking reference';
COMMENT ON COLUMN flight_bookings.flight_details IS 'JSON with detailed flight information';
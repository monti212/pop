/*
  # Add Status and Notes Fields to Attendance Records

  ## Summary
  Enhances the attendance_records table to support richer attendance tracking:
  - Adds status field to track 'present', 'absent', 'late', 'excused' statuses
  - Adds notes field for optional contextual information
  - Maintains backward compatibility with is_present boolean field
  - Auto-calculates is_present from status for existing queries

  ## Changes
  
  1. **New Columns**
     - status: Text field with check constraint for valid values
     - notes: Optional text field for additional context
  
  2. **Data Migration**
     - Converts existing is_present values to appropriate status
     - true -> 'present'
     - false -> 'absent'
  
  3. **Triggers**
     - Auto-sync is_present field based on status for backward compatibility
  
  ## Backward Compatibility
  - is_present field remains and is auto-calculated from status
  - Existing queries using is_present will continue to work
  - New features can use the richer status field
*/

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Add status column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'status'
  ) THEN
    ALTER TABLE attendance_records 
    ADD COLUMN status text CHECK (status IN ('present', 'absent', 'late', 'excused'));
  END IF;
END $$;

-- Add notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'notes'
  ) THEN
    ALTER TABLE attendance_records 
    ADD COLUMN notes text;
  END IF;
END $$;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================

-- Convert existing is_present values to status
UPDATE attendance_records
SET status = CASE 
  WHEN is_present = true THEN 'present'
  WHEN is_present = false THEN 'absent'
  ELSE 'absent'
END
WHERE status IS NULL;

-- Make status NOT NULL after data migration
ALTER TABLE attendance_records 
ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- 3. CREATE TRIGGER TO SYNC is_present WITH status
-- ============================================================================

-- Function to auto-calculate is_present from status
CREATE OR REPLACE FUNCTION sync_attendance_is_present()
RETURNS TRIGGER AS $$
BEGIN
  -- Set is_present based on status
  NEW.is_present = (NEW.status = 'present' OR NEW.status = 'late');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_is_present_from_status ON attendance_records;
CREATE TRIGGER sync_is_present_from_status
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION sync_attendance_is_present();

-- ============================================================================
-- 4. UPDATE INDEXES
-- ============================================================================

-- Add index on status for efficient filtering
CREATE INDEX IF NOT EXISTS attendance_status_idx ON attendance_records(status);

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN attendance_records.status IS 'Attendance status: present, absent, late, or excused';
COMMENT ON COLUMN attendance_records.notes IS 'Optional notes about the attendance record (e.g., reason for absence)';

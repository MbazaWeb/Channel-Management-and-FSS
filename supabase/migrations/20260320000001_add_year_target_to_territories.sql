-- Add year_target field to territories table
-- Year target auto-distributes to monthly targets (year_target / 12)
ALTER TABLE territories ADD COLUMN IF NOT EXISTS year_target integer DEFAULT 0;

-- Update existing territories: set year_target based on monthly_target * 12
UPDATE territories SET year_target = COALESCE(monthly_target, 0) * 12 WHERE year_target IS NULL OR year_target = 0;

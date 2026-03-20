-- Add fss_user field to applications table
-- This field tracks whether a channel has FSS (Field Sales System) access
ALTER TABLE applications ADD COLUMN IF NOT EXISTS fss_user boolean DEFAULT false;

-- Create index for faster FSS user queries
CREATE INDEX IF NOT EXISTS idx_applications_fss_user ON applications(fss_user) WHERE fss_user = true;

-- Update existing approved applications to have fss_user = false by default
-- Admin can then manually enable FSS access for approved channels
UPDATE applications SET fss_user = false WHERE fss_user IS NULL;

-- Add active status fields to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS last_active_month TEXT;

-- Add source field to distinguish imported (migration) vs new recruitment
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'application' CHECK (source IN ('application', 'import'));

-- Create index for faster active status lookups
CREATE INDEX IF NOT EXISTS idx_applications_is_active ON public.applications(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_channel_active ON public.applications(channel, is_active);
CREATE INDEX IF NOT EXISTS idx_applications_zone_active ON public.applications(zone_id, is_active);
CREATE INDEX IF NOT EXISTS idx_applications_territory_active ON public.applications(territory_id, is_active);
CREATE INDEX IF NOT EXISTS idx_applications_source ON public.applications(source);

-- Comment on columns
COMMENT ON COLUMN public.applications.is_active IS 'Whether the channel partner sold at least 1 set in the current tracking period';
COMMENT ON COLUMN public.applications.last_active_date IS 'Date when the channel was last marked as active';
COMMENT ON COLUMN public.applications.last_active_month IS 'Month/Year when the channel was last active (e.g., 2026-03)';
COMMENT ON COLUMN public.applications.source IS 'application = new recruitment (counts toward target), import = migrated existing base (does not count toward target)';

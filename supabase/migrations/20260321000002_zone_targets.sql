-- Add regional ESP and DSF targets to zones table
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS esp_target INTEGER DEFAULT 0;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS dsf_target INTEGER DEFAULT 0;

-- Create index for target lookups
CREATE INDEX IF NOT EXISTS idx_zones_targets ON public.zones(esp_target, dsf_target);

-- Comment on columns  
COMMENT ON COLUMN public.zones.esp_target IS 'Monthly regional ESP recruitment target';
COMMENT ON COLUMN public.zones.dsf_target IS 'Monthly regional DSF recruitment target';

-- Add ESP and DSF targets to territories table
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS esp_target INTEGER DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS dsf_target INTEGER DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS esp_monthly_target INTEGER DEFAULT 0;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS dsf_monthly_target INTEGER DEFAULT 0;

-- Create index for target lookups
CREATE INDEX IF NOT EXISTS idx_territories_targets ON public.territories(esp_target, dsf_target);

-- Comment on columns  
COMMENT ON COLUMN public.territories.esp_target IS 'Yearly ESP recruitment target for territory';
COMMENT ON COLUMN public.territories.dsf_target IS 'Yearly DSF recruitment target for territory';
COMMENT ON COLUMN public.territories.esp_monthly_target IS 'Monthly ESP recruitment target (esp_target / 12)';
COMMENT ON COLUMN public.territories.dsf_monthly_target IS 'Monthly DSF recruitment target (dsf_target / 12)';

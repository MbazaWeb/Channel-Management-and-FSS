-- Add channel field to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'ESP' CHECK (channel IN ('ESP', 'DSF'));

-- Create Team Leaders (TL) table
CREATE TABLE IF NOT EXISTS public.team_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  cluster TEXT,
  target_dsf_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team leaders" ON public.team_leaders FOR SELECT USING (true);
CREATE POLICY "Admins can manage team leaders" ON public.team_leaders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create DSF table for DSF-specific applications
CREATE TABLE IF NOT EXISTS public.dsf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE UNIQUE,
  dsf_name TEXT NOT NULL,
  d_number TEXT NOT NULL,
  fss_user BOOLEAN DEFAULT false,
  team_leader_id UUID REFERENCES public.team_leaders(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  fss_status TEXT DEFAULT 'pending' CHECK (fss_status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dsf_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dsf records" ON public.dsf_records FOR SELECT USING (true);
CREATE POLICY "Admins can manage dsf records" ON public.dsf_records FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert dsf records" ON public.dsf_records FOR INSERT WITH CHECK (true);

-- Add DSF fields to applications table for form submission
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS team_leader_id UUID REFERENCES public.team_leaders(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS dsf_d_number TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS dsf_fss_user BOOLEAN DEFAULT false;

-- Triggers for updated_at
CREATE TRIGGER update_team_leaders_updated_at BEFORE UPDATE ON public.team_leaders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dsf_records_updated_at BEFORE UPDATE ON public.dsf_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create DSF record when DSF application is approved
CREATE OR REPLACE FUNCTION public.create_dsf_record_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel = 'DSF' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.dsf_records (
      application_id,
      dsf_name,
      d_number,
      fss_user,
      team_leader_id,
      zone_id,
      territory_id,
      fss_status
    )
    VALUES (
      NEW.id,
      NEW.contact_person_name || ' ' || NEW.contact_person_surname,
      COALESCE(NEW.dsf_d_number, ''),
      COALESCE(NEW.dsf_fss_user, false),
      NEW.team_leader_id,
      NEW.zone_id,
      NEW.territory_id,
      CASE WHEN NEW.dsf_fss_user THEN 'active' ELSE 'pending' END
    )
    ON CONFLICT (application_id) DO UPDATE SET
      dsf_name = EXCLUDED.dsf_name,
      d_number = EXCLUDED.d_number,
      fss_user = EXCLUDED.fss_user,
      team_leader_id = EXCLUDED.team_leader_id,
      zone_id = EXCLUDED.zone_id,
      territory_id = EXCLUDED.territory_id,
      fss_status = EXCLUDED.fss_status,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_dsf_application_approved
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_dsf_record_on_approval();

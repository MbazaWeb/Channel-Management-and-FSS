
-- Create zones table
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Admins can manage zones" ON public.zones FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add zone_id to territories
ALTER TABLE public.territories ADD COLUMN zone_id uuid REFERENCES public.zones(id);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('application-attachments', 'application-attachments', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'application-attachments');
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'application-attachments');
CREATE POLICY "Admins can delete attachments" ON storage.objects FOR DELETE USING (bucket_id = 'application-attachments' AND public.has_role(auth.uid(), 'admin'));

-- Application attachments table
CREATE TABLE public.application_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view application attachments" ON public.application_attachments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert attachments" ON public.application_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete attachments" ON public.application_attachments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add signed_at, witness fields to applications
ALTER TABLE public.applications 
  ADD COLUMN signed_at_location text,
  ADD COLUMN witness1_name text,
  ADD COLUMN witness2_name text,
  ADD COLUMN zone_id uuid REFERENCES public.zones(id);

-- Trigger for zones updated_at
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Fix overly permissive INSERT policy on applications
DROP POLICY "Anyone can submit applications" ON public.applications;
CREATE POLICY "Authenticated users can submit applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

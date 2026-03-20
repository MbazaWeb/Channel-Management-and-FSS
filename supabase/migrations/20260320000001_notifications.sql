-- Add 'in_progress' status to applications
ALTER TABLE public.applications DROP CONSTRAINT applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check 
  CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected'));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_application', 'status_change', 'approved', 'rejected', 'in_progress', 'info')),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to create notification on new application
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (title, message, type, application_id)
  VALUES (
    'New Application Submitted',
    'New application from ' || NEW.trading_name || ' (' || NEW.contact_person_name || ' ' || NEW.contact_person_surname || ')',
    'new_application',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_application_created 
  AFTER INSERT ON public.applications 
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_new_application();

-- Function to create notification on status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (title, message, type, application_id, created_by)
    VALUES (
      CASE NEW.status
        WHEN 'approved' THEN 'Application Approved'
        WHEN 'rejected' THEN 'Application Rejected'
        WHEN 'in_progress' THEN 'Application In Progress'
        ELSE 'Status Changed'
      END,
      'Application from ' || NEW.trading_name || ' status changed to ' || NEW.status,
      NEW.status,
      NEW.id,
      NEW.reviewed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_application_status_changed 
  AFTER UPDATE ON public.applications 
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_status_change();


-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'de');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Territories table
CREATE TABLE public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_target INTEGER DEFAULT 0,
  weekly_target INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view territories" ON public.territories FOR SELECT USING (true);
CREATE POLICY "Admins can manage territories" ON public.territories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- DE territory assignments
CREATE TABLE public.de_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, territory_id)
);
ALTER TABLE public.de_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DEs can view own assignments" ON public.de_territories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage DE assignments" ON public.de_territories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Business Details
  trading_name TEXT NOT NULL,
  registration_number TEXT,
  citizenship TEXT,
  vat_number TEXT,
  contact_person_name TEXT NOT NULL,
  contact_person_surname TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  credit_check_consent BOOLEAN DEFAULT false,
  -- Business Representative
  telephone_work TEXT,
  telephone_cell TEXT NOT NULL,
  email1 TEXT NOT NULL,
  email2 TEXT,
  physical_address TEXT,
  postal_address TEXT,
  customer_number TEXT,
  authority_to_transact TEXT,
  designation_capacity TEXT,
  -- Sales Channel Type (array)
  channel_types TEXT[] DEFAULT '{}',
  channel_type_other TEXT,
  -- Responsibilities (array)
  responsibilities TEXT[] DEFAULT '{}',
  -- Declaration
  conflict_of_interest BOOLEAN DEFAULT false,
  conflict_details TEXT,
  signature_text TEXT,
  declaration_date DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  territory_id UUID REFERENCES public.territories(id),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Public can insert (for the application form)
CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT WITH CHECK (true);
-- Public dashboard reads
CREATE POLICY "Anyone can view applications" ON public.applications FOR SELECT USING (true);
-- Admins can update
CREATE POLICY "Admins can update applications" ON public.applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
-- DEs can update their own submissions
CREATE POLICY "DEs can update own submissions" ON public.applications FOR UPDATE USING (auth.uid() = submitted_by);

-- User roles policies
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

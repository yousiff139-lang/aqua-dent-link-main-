-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'dentist', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create dentists table
CREATE TABLE public.dentists (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  bio TEXT,
  years_of_experience INTEGER,
  rating DECIMAL(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- RLS policies for dentists
CREATE POLICY "Anyone can view dentists"
  ON public.dentists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dentists can update their own profile"
  ON public.dentists FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Dentists can insert their own profile"
  ON public.dentists FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create dentist_availability table
CREATE TABLE public.dentist_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dentist_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies for dentist_availability
CREATE POLICY "Anyone can view availability"
  ON public.dentist_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dentists can manage their own availability"
  ON public.dentist_availability FOR ALL
  USING (public.has_role(auth.uid(), 'dentist') AND auth.uid() = dentist_id);

-- Add columns to appointments table
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS symptoms TEXT,
  ADD COLUMN IF NOT EXISTS recommended_by_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES public.dentists(id);

-- Update appointments RLS to include dentists
CREATE POLICY "Dentists can view their appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(), 'dentist') AND auth.uid() = dentist_id);

CREATE POLICY "Dentists can update their appointments"
  ON public.appointments FOR UPDATE
  USING (public.has_role(auth.uid(), 'dentist') AND auth.uid() = dentist_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID NOT NULL,
  message TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-assign patient role on signup
CREATE OR REPLACE FUNCTION public.assign_patient_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_patient_role();

-- Update timestamp trigger for dentists
CREATE TRIGGER update_dentists_updated_at
  BEFORE UPDATE ON public.dentists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for dentist_availability
CREATE TRIGGER update_dentist_availability_updated_at
  BEFORE UPDATE ON public.dentist_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
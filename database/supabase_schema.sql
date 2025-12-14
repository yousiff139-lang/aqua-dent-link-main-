-- ============================================================================
-- DentalCare Connect - Supabase Database Schema
-- ============================================================================
-- IMPORTANT: Upload this SQL file to your Supabase SQL Editor to set up
-- the complete database schema required for the application to work.
--
-- Prerequisites:
-- 1. Create a new Supabase project at https://supabase.com
-- 2. Go to SQL Editor in your Supabase dashboard
-- 3. Paste this entire file and run it
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Stores user profile information linked to Supabase Auth
-- ============================================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  full_name text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'patient'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- DENTISTS TABLE
-- Stores dentist information and profiles
-- ============================================================================
CREATE TABLE public.dentists (
  id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  specialization text,
  rating numeric DEFAULT 0.0,
  experience_years integer DEFAULT 0,
  years_of_experience integer DEFAULT 0,
  phone text,
  address text,
  bio text,
  education text,
  expertise text[],
  image_url text,
  available_times jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profile_picture text,
  status text DEFAULT 'active'::text,
  specialty text,
  CONSTRAINT dentists_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- DENTAL SERVICES TABLE
-- Stores available dental services with pricing
-- ============================================================================
CREATE TABLE public.dental_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  specialty character varying NOT NULL,
  duration_minutes integer NOT NULL,
  price_min numeric NOT NULL,
  price_max numeric,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT dental_services_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- APPOINTMENTS TABLE
-- Main appointments table with all booking information
-- ============================================================================
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  dentist_id uuid,
  patient_name text NOT NULL,
  patient_email text NOT NULL,
  patient_phone text NOT NULL,
  patient_age integer,
  patient_medical_conditions text,
  dentist_name text,
  dentist_email text,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  appointment_type text DEFAULT 'General Checkup'::text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'upcoming'::text, 'completed'::text, 'cancelled'::text])),
  payment_method text CHECK (payment_method = ANY (ARRAY['stripe'::text, 'cash'::text])),
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'failed'::text])),
  payment_amount numeric,
  stripe_session_id text,
  stripe_payment_intent_id text,
  chief_complaint text,
  symptoms text,
  reason text,
  medical_history text,
  smoking boolean DEFAULT false,
  medications text,
  allergies text,
  previous_dental_work text,
  cause_identified boolean DEFAULT true,
  uncertainty_note text,
  patient_notes text,
  dentist_notes text,
  notes text,
  documents jsonb DEFAULT '[]'::jsonb,
  pdf_report_url text,
  pdf_summary_url text,
  booking_reference text UNIQUE,
  conversation_id text,
  booking_source text DEFAULT 'manual'::text,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  appointment_reason text,
  estimated_price numeric,
  service_id uuid,
  service_name character varying,
  service_price numeric,
  service_duration integer,
  chronic_diseases text,
  gender text,
  is_pregnant boolean DEFAULT false,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id),
  CONSTRAINT appointments_dentist_id_fkey FOREIGN KEY (dentist_id) REFERENCES public.dentists(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.dental_services(id)
);

-- ============================================================================
-- APPOINTMENT TYPES TABLE
-- Defines types of appointments with pricing
-- ============================================================================
CREATE TABLE public.appointment_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_name text NOT NULL UNIQUE,
  description text,
  base_price numeric NOT NULL,
  duration_minutes integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  applicable_specialties text[],
  CONSTRAINT appointment_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- APPOINTMENT HEALTH INFO TABLE
-- Stores patient health information for appointments
-- ============================================================================
CREATE TABLE public.appointment_health_info (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  appointment_id uuid,
  patient_id uuid NOT NULL,
  gender character varying NOT NULL CHECK (gender::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])),
  is_pregnant boolean,
  phone character varying NOT NULL,
  chronic_diseases text,
  medical_history text,
  symptoms text NOT NULL,
  suggested_specialty character varying,
  ai_confidence numeric,
  ai_explanation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointment_health_info_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_health_info_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT appointment_health_info_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- APPOINTMENT MEDICAL INFO TABLE
-- Additional medical information for appointments
-- ============================================================================
CREATE TABLE public.appointment_medical_info (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE,
  patient_id uuid NOT NULL,
  gender text,
  is_pregnant boolean DEFAULT false,
  chronic_diseases text,
  medical_history text,
  medications text,
  allergies text,
  previous_dental_work text,
  smoking boolean DEFAULT false,
  symptoms text,
  chief_complaint text,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointment_medical_info_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_medical_info_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT appointment_medical_info_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- AVAILABILITY TABLE
-- General availability schedule for dentists
-- ============================================================================
CREATE TABLE public.availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dentist_id uuid,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT availability_pkey PRIMARY KEY (id),
  CONSTRAINT availability_dentist_id_fkey FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
);

-- ============================================================================
-- DENTIST AVAILABILITY TABLE
-- Detailed availability with slot durations
-- ============================================================================
CREATE TABLE public.dentist_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  slot_duration_minutes integer DEFAULT 30,
  CONSTRAINT dentist_availability_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- DENTIST REVIEWS TABLE
-- Patient reviews for dentists
-- ============================================================================
CREATE TABLE public.dentist_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dentist_id uuid,
  patient_id uuid,
  appointment_id uuid,
  patient_name character varying NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT dentist_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT dentist_reviews_dentist_id_fkey FOREIGN KEY (dentist_id) REFERENCES public.dentists(id),
  CONSTRAINT dentist_reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT dentist_reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

-- ============================================================================
-- MEDICAL DOCUMENTS TABLE
-- Stores uploaded medical documents and X-rays
-- ============================================================================
CREATE TABLE public.medical_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  health_info_id uuid,
  patient_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying,
  file_size_bytes bigint,
  uploaded_at timestamp with time zone DEFAULT now(),
  is_xray boolean DEFAULT false,
  xray_format text CHECK (xray_format = ANY (ARRAY['DCM'::text, 'PNG'::text, 'JPEG'::text, 'DICOM'::text, NULL::text])),
  xray_analysis_result jsonb,
  analyzed_at timestamp with time zone,
  analysis_status text DEFAULT 'pending'::text CHECK (analysis_status = ANY (ARRAY['pending'::text, 'analyzing'::text, 'completed'::text, 'failed'::text, 'not_xray'::text])),
  appointment_id uuid,
  CONSTRAINT medical_documents_pkey PRIMARY KEY (id),
  CONSTRAINT medical_documents_health_info_id_fkey FOREIGN KEY (health_info_id) REFERENCES public.appointment_health_info(id),
  CONSTRAINT medical_documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id),
  CONSTRAINT medical_documents_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

-- ============================================================================
-- CHATBOT CONVERSATIONS TABLE
-- Stores AI chatbot conversation history
-- ============================================================================
CREATE TABLE public.chatbot_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  messages jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])),
  booking_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_conversations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- CHATBOT LOGS TABLE
-- Logs chatbot interactions for analytics
-- ============================================================================
CREATE TABLE public.chatbot_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  response text,
  intent text,
  confidence numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chatbot_logs_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- User notifications for appointments and payments
-- ============================================================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['appointment_confirmation'::text, 'appointment_reminder'::text, 'appointment_cancelled'::text, 'payment_confirmation'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE
-- Tracks all payment transactions
-- ============================================================================
CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd'::text,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])),
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- REALTIME EVENTS TABLE
-- Stores real-time events for live updates
-- ============================================================================
CREATE TABLE public.realtime_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT realtime_events_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- TIME SLOT RESERVATIONS TABLE
-- Manages temporary time slot reservations
-- ============================================================================
CREATE TABLE public.time_slot_reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dentist_id uuid NOT NULL,
  slot_time timestamp with time zone NOT NULL,
  reserved_by uuid,
  reservation_expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'reserved'::text CHECK (status = ANY (ARRAY['reserved'::text, 'confirmed'::text, 'expired'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT time_slot_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT time_slot_reservations_dentist_id_fkey FOREIGN KEY (dentist_id) REFERENCES public.dentists(id),
  CONSTRAINT time_slot_reservations_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- USER ROLES TABLE
-- Manages user roles (patient, dentist, admin)
-- ============================================================================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['patient'::text, 'dentist'::text, 'admin'::text])),
  dentist_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- X-RAY UPLOADS TABLE
-- Tracks X-ray image uploads and analysis
-- ============================================================================
CREATE TABLE public.xray_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  file_path text NOT NULL,
  analysis text,
  analyzed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT xray_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT xray_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- After running this schema, make sure to:
-- 1. Enable Row Level Security (RLS) on tables as needed
-- 2. Create appropriate RLS policies for your security requirements
-- 3. Set up Storage buckets for file uploads
-- 4. Configure Supabase Auth settings
-- ============================================================================

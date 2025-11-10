-- RLS policies for Admin, Dentist, and User flows

-- Simple role model via JWT claim 'role' and optional 'dentist_id'
-- Adjust your auth to include these if needed

-- PROFILES: public readable
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

-- DENTISTS: public readable; admins can write; dentists can update own row
DROP POLICY IF EXISTS "dentists_select_all" ON public.dentists;
CREATE POLICY "dentists_select_all" ON public.dentists FOR SELECT USING (true);

DROP POLICY IF EXISTS "dentists_admin_write" ON public.dentists;
CREATE POLICY "dentists_admin_write" ON public.dentists
  FOR INSERT TO authenticated
  WITH CHECK (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

DROP POLICY IF EXISTS "dentists_admin_update" ON public.dentists;
CREATE POLICY "dentists_admin_update" ON public.dentists
  FOR UPDATE TO authenticated
  USING (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  WITH CHECK (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

DROP POLICY IF EXISTS "dentists_admin_delete" ON public.dentists;
CREATE POLICY "dentists_admin_delete" ON public.dentists
  FOR DELETE TO authenticated
  USING (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

DROP POLICY IF EXISTS "dentists_self_update" ON public.dentists;
CREATE POLICY "dentists_self_update" ON public.dentists
  FOR UPDATE TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = id::text)
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = id::text);

-- AVAILABILITY: public readable; admin full; dentist own
DROP POLICY IF EXISTS "availability_select" ON public.dentist_availability;
CREATE POLICY "availability_select" ON public.dentist_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "availability_admin_full" ON public.dentist_availability;
CREATE POLICY "availability_admin_full" ON public.dentist_availability
  FOR ALL TO authenticated
  USING (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  WITH CHECK (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

DROP POLICY IF EXISTS "availability_dentist_own" ON public.dentist_availability;
CREATE POLICY "availability_dentist_own" ON public.dentist_availability
  FOR ALL TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = dentist_id::text)
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = dentist_id::text);

-- APPOINTMENTS: public can create (book); admin full; dentist own
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
CREATE POLICY "appointments_public_insert" ON public.appointments
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_select_by_dentist_or_admin" ON public.appointments;
CREATE POLICY "appointments_select_by_dentist_or_admin" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
    OR ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = dentist_id::text)
  );

DROP POLICY IF EXISTS "appointments_admin_full" ON public.appointments;
CREATE POLICY "appointments_admin_full" ON public.appointments
  FOR ALL TO authenticated
  USING (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  WITH CHECK (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

DROP POLICY IF EXISTS "appointments_dentist_update_own" ON public.appointments;
CREATE POLICY "appointments_dentist_update_own" ON public.appointments
  FOR UPDATE TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = dentist_id::text)
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'dentist_id') = dentist_id::text);







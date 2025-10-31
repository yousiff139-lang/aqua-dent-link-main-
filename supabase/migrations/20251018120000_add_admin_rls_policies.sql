-- Add RLS policies for admin users to access all data

-- Allow admins to view all appointments
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Allow admins to view all dentists
CREATE POLICY "Admins can view all dentists"
  ON public.dentists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Allow admins to update appointments (for management purposes)
CREATE POLICY "Admins can update all appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Add explicit policy to deny anonymous access to profiles table
CREATE POLICY "Deny anonymous profile access" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);
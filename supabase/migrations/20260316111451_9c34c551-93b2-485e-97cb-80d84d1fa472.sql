
-- Drop dangerous Dev bypass policies on all tables
DROP POLICY IF EXISTS "Dev_Public_Access_Patients" ON public.patients;
DROP POLICY IF EXISTS "Dev_Public_Access_Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dev_Public_Access_Messages" ON public.messages;

-- Drop overly permissive read policies
DROP POLICY IF EXISTS "Public read patients" ON public.patients;
DROP POLICY IF EXISTS "Public read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public read messages" ON public.messages;

-- Drop anon write policies
DROP POLICY IF EXISTS "Public insert patients" ON public.patients;
DROP POLICY IF EXISTS "Public update patients" ON public.patients;
DROP POLICY IF EXISTS "Public delete patients" ON public.patients;

DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public delete appointments" ON public.appointments;

DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
DROP POLICY IF EXISTS "Public update messages" ON public.messages;
DROP POLICY IF EXISTS "Public delete messages" ON public.messages;

-- Create authenticated-only policies for patients
CREATE POLICY "Authenticated read patients" ON public.patients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert patients" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update patients" ON public.patients
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete patients" ON public.patients
  FOR DELETE TO authenticated USING (true);

-- Create authenticated-only policies for appointments
CREATE POLICY "Authenticated read appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (true);

-- Create authenticated-only policies for messages
CREATE POLICY "Authenticated read messages" ON public.messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update messages" ON public.messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete messages" ON public.messages
  FOR DELETE TO authenticated USING (true);

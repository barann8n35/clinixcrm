-- Replace overly permissive ALL policies with explicit anon/authenticated policies
DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;

-- Patients
CREATE POLICY "Public read patients"
ON public.patients
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert patients"
ON public.patients
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public update patients"
ON public.patients
FOR UPDATE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]))
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public delete patients"
ON public.patients
FOR DELETE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

-- Messages
CREATE POLICY "Public read messages"
ON public.messages
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert messages"
ON public.messages
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public update messages"
ON public.messages
FOR UPDATE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]))
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public delete messages"
ON public.messages
FOR DELETE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

-- Appointments
CREATE POLICY "Public read appointments"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public update appointments"
ON public.appointments
FOR UPDATE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]))
WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE POLICY "Public delete appointments"
ON public.appointments
FOR DELETE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));
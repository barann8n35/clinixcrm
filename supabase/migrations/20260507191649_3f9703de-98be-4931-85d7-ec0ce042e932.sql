-- Seed minimal example data (1 of each missing kind) for the primary admin
DO $$
DECLARE
  v_admin uuid := 'c1fe9bf6-9190-4d3f-9847-b8b79d539771';
  v_pid text := 'patient_postop_demo';
  v_apt uuid;
BEGIN
  -- 1 Post-Op patient (so PostOpBadge shows up in Pipeline)
  INSERT INTO public.patients (id, user_id, name, phone, status, platform, complaint, is_ai_active, created_at, updated_at)
  VALUES (v_pid, v_admin, 'Demo Hasta (Post-Op)', '905551112233', 'post_op', 'whatsapp', 'Ameliyat sonrası takip', true, now() - interval '3 days', now() - interval '2 days')
  ON CONFLICT (id) DO UPDATE SET status='post_op', updated_at=EXCLUDED.updated_at;

  -- 1 example appointment for that patient
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE patient_id = v_pid) THEN
    INSERT INTO public.appointments (user_id, patient_id, doctor, type, scheduled_at, status)
    VALUES (v_admin, v_pid, 'Dr. İlhan Elmacı', 'Kontrol', now() + interval '7 days', 'upcoming');
  END IF;

  -- 1 example inbound message for that patient
  IF NOT EXISTS (SELECT 1 FROM public.messages WHERE patient_id = v_pid) THEN
    INSERT INTO public.messages (user_id, patient_id, sender_type, text, platform, is_processed)
    VALUES (v_admin, v_pid, 'patient', 'Merhaba, ameliyat sonrası küçük bir sorum olacak.', 'whatsapp', true);
  END IF;

  -- 1 example inventory item
  IF NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE name = 'Steril Gazlı Bez') THEN
    INSERT INTO public.inventory_items (name, category, current_stock, critical_level, unit)
    VALUES ('Steril Gazlı Bez', 'Sarf Malzeme', 50, 10, 'paket');
  END IF;

  -- 1 example notification for the admin
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_admin AND title = 'Hoş geldiniz 👋') THEN
    INSERT INTO public.notifications (user_id, type, title, description, scope)
    VALUES (v_admin, 'info', 'Hoş geldiniz 👋', 'Clinix paneline hoş geldiniz. Sistem canlıya hazır.', 'personal');
  END IF;
END $$;
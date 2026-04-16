INSERT INTO public.user_roles (user_id, role)
VALUES ('c1fe9bf6-9190-4d3f-9847-b8b79d539771', 'admin'::app_role)
ON CONFLICT DO NOTHING;
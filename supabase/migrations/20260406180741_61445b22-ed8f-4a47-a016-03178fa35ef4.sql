
-- 1. Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Add 'pending' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pending';

-- 3. Update handle_new_user to store username/full_name and assign pending role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'username'
  );

  -- Assign pending role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Function to notify admins when a pending user registers
CREATE OR REPLACE FUNCTION public.notify_admins_on_pending_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  new_user_name TEXT;
BEGIN
  -- Only trigger for 'pending' role assignments
  IF NEW.role != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get the user's full name from profiles
  SELECT full_name INTO new_user_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF new_user_name IS NULL THEN
    new_user_name := 'Yeni Kullanıcı';
  END IF;

  -- Insert notification for each admin
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      admin_record.user_id,
      'new_registration',
      '👤 Yeni Kayıt İsteği',
      new_user_name || ' sisteme kayıt oldu ve onayınızı bekliyor.'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 5. Create trigger on user_roles
CREATE TRIGGER on_pending_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_pending_user();

-- Solo para desarrollo local: crea el usuario entrenador de prueba.
--   email: entrenador@ejemplo.com   contraseña: demo1234
-- Los clientes de ejemplo se cargan desde la app (Ajustes > Cargar datos de ejemplo).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated',
  'authenticated', 'entrenador@ejemplo.com', crypt('demo1234', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"nombre":"Entrenador Demo"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"entrenador@ejemplo.com"}', 'email', now(), now(), now());

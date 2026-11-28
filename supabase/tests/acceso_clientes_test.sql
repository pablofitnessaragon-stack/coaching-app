-- =============================================================================
-- Tests de privacidad: ¿qué puede ver y tocar cada usuario?
-- Se ejecutan con:  npx supabase test db
--
-- Escenario:
--   * Entrenador (el del seed, 1111...).
--   * Ana (2222...): cliente con cuenta. Empieza SIN acceso al portal.
--   * Berta (3333...): otra cliente con cuenta y CON acceso.
--   * Carlos: cliente sin cuenta.
--   * Intruso (4444...): alguien con cuenta pero sin ficha.
-- Cada uno tiene pesos, medidas, notas y plan. Comprobamos que nadie ve lo de
-- otro y que Ana solo ve lo suyo cuando el entrenador le da acceso.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ---------- Preparación (como administrador, sin reglas) ----------
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'ana@ejemplo.com', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'berta@ejemplo.com', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'intruso@ejemplo.com', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'sinconfirmar@ejemplo.com', null, '{}', now(), now());

select is((select rol from public.perfiles where id = '22222222-2222-2222-2222-222222222222'), 'cliente',
  'una cuenta nueva (que no es la primera) es de tipo cliente');

insert into public.clientes (id, entrenador_id, usuario_id, acceso_portal, nombre, sexo, fecha_nacimiento, altura_cm, peso_inicial_kg, objetivo)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, false, 'Ana', 'mujer', '1990-01-01', 165, 65, 'perdida_grasa'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', true, 'Berta', 'mujer', '1992-01-01', 170, 70, 'mantenimiento'),
  ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', null, false, 'Carlos', 'hombre', '1985-01-01', 180, 85, 'ganancia_muscular');

insert into public.registros_peso (cliente_id, fecha, peso_kg)
select c, d::date, 70 from unnest(array['aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003']::uuid[]) c,
  generate_series('2026-11-01'::date, '2026-11-03'::date, '1 day') d;
insert into public.medidas (cliente_id, fecha, cintura_cm)
select c, '2026-11-01', 80 from unnest(array['aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003']::uuid[]) c;
insert into public.notas_cliente (cliente_id, texto)
select c, 'nota privada del entrenador' from unnest(array['aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002']::uuid[]) c;
insert into public.planes_nutricionales (id, cliente_id, config, datos_cliente, peso_referencia_kg, media_semanal_kcal)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '{}', '{}', 65, 1800),
       ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{}', '{}', 70, 2000);
insert into public.objetivos_dia (plan_id, tipo_dia, kcal, proteina_g, grasa_g, carbohidratos_g, fibra_g, agua_l)
values ('dddddddd-0000-0000-0000-000000000001', 'entreno', 1900, 130, 60, 200, 25, 2.5),
       ('dddddddd-0000-0000-0000-000000000002', 'entreno', 2100, 130, 70, 220, 25, 2.5);
insert into public.formularios_alta (entrenador_id, cliente_id, estado, respuestas)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'convertido', '{"salud":"privado"}');

-- Funciones para "hacerse pasar" por un usuario conectado
create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Cuántas filas ve el usuario actual (0 si ni siquiera tiene permiso de lectura)
create function pg_temp.filas_visibles() returns bigint language plpgsql as $$
begin
  return (select count(*) from public.clientes) + (select count(*) from public.registros_peso) + (select count(*) from public.medidas);
exception when insufficient_privilege then
  return 0;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- ---------- Ana todavía SIN acceso ----------
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select count(*) from public.clientes), 0::bigint, 'sin acceso: Ana no ve ninguna ficha');
select is((select count(*) from public.registros_peso), 0::bigint, 'sin acceso: Ana no ve ningún peso');
select throws_ok(
  $$ insert into public.registros_peso (cliente_id, fecha, peso_kg) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-10', 64) $$,
  '42501', null, 'sin acceso: Ana no puede apuntar peso');
select throws_ok(
  $$ select public.dar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001', 'ana@ejemplo.com') $$,
  'P0001', 'No autorizado', 'un cliente no puede darse acceso a sí mismo');
reset role;

-- ---------- El entrenador le da acceso ----------
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select is(public.dar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001', 'entrenador@ejemplo.com'), 'sin_cuenta',
  'nunca se enlaza la cuenta del entrenador a una ficha');
select is(public.dar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001', 'sinconfirmar@ejemplo.com'), 'sin_cuenta',
  'no se enlaza una cuenta con el email sin confirmar');
select is(public.dar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001', 'berta@ejemplo.com'), 'cuenta_ocupada',
  'no se puede enlazar la cuenta de Berta a la ficha de Ana');
select is(public.dar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001', '  ANA@ejemplo.com '), 'ok',
  'el entrenador da acceso a Ana con su email');
select is((select count(*) from public.clientes), 3::bigint, 'el entrenador sigue viendo a sus 3 clientes');
reset role;

-- ---------- Ana CON acceso: solo lo suyo ----------
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select results_eq('select nombre from public.clientes', $$ values ('Ana'::text) $$, 'Ana solo ve su propia ficha');
select is((select count(*) from public.registros_peso where cliente_id <> 'aaaaaaaa-0000-0000-0000-000000000001'), 0::bigint,
  'Ana no ve pesos de nadie más');
select is((select count(*) from public.registros_peso), 3::bigint, 'Ana ve sus 3 pesos');
select is((select count(*) from public.medidas), 1::bigint, 'Ana solo ve sus medidas');
select is((select count(*) from public.planes_nutricionales), 1::bigint, 'Ana solo ve su plan');
select is((select count(*) from public.objetivos_dia), 1::bigint, 'Ana solo ve sus objetivos');
select is((select count(*) from public.notas_cliente), 0::bigint, 'Ana no ve las notas privadas del entrenador');
select is((select count(*) from public.formularios_alta), 0::bigint, 'Ana no ve los formularios de alta');
select is((select count(*) from public.perfiles), 1::bigint, 'Ana solo ve su propio perfil');

-- Apuntar su peso: sí; hacerse pasar por otro: no
insert into public.registros_peso (cliente_id, fecha, peso_kg, registrado_por)
values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-10', 64, '11111111-1111-1111-1111-111111111111');
select is((select registrado_por from public.registros_peso where fecha = '2026-11-10'), '22222222-2222-2222-2222-222222222222'::uuid,
  'Ana apunta su peso y queda registrado a su nombre, aunque intente poner otro');
select throws_ok(
  $$ insert into public.registros_peso (cliente_id, fecha, peso_kg) values ('bbbbbbbb-0000-0000-0000-000000000002', '2026-11-10', 99) $$,
  '42501', null, 'Ana no puede apuntar peso en la ficha de Berta');

-- Cambios que no debe poder hacer (no afectan a ninguna fila)
update public.registros_peso set peso_kg = 99 where cliente_id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.clientes set acceso_portal = true, objetivo = 'rendimiento' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok($$ update public.perfiles set rol = 'entrenador' where id = auth.uid() $$, '42501', null,
  'Ana no puede convertirse en entrenadora');
reset role;
select is((select count(*) from public.registros_peso where cliente_id = 'bbbbbbbb-0000-0000-0000-000000000002' and peso_kg = 99), 0::bigint,
  'Ana no ha podido cambiar los pesos de Berta');
select is((select objetivo from public.clientes where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'perdida_grasa',
  'Ana no puede cambiar su propia ficha');

-- ---------- Alguien con cuenta pero sin ficha ----------
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select is((select count(*) from public.clientes) + (select count(*) from public.registros_peso) + (select count(*) from public.medidas),
  0::bigint, 'una cuenta sin ficha no ve nada');
reset role;

-- ---------- Visitante sin sesión ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(pg_temp.filas_visibles(), 0::bigint, 'sin sesión no se ve ninguna ficha, peso ni medida');
reset role;

-- ---------- El entrenador quita el acceso ----------
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select public.quitar_acceso_portal('aaaaaaaa-0000-0000-0000-000000000001');
reset role;
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select count(*) from public.clientes) + (select count(*) from public.registros_peso), 0::bigint,
  'al quitarle el acceso, Ana deja de ver sus datos al momento');
reset role;

select * from finish();
rollback;

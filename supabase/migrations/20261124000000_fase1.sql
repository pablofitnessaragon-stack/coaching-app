-- =============================================================================
-- Fase 1: usuarios, clientes, notas, planes nutricionales y registros de peso.
--
-- Seguridad (RGPD): todas las tablas tienen "Row Level Security" (RLS):
-- la propia base de datos decide qué filas puede ver cada usuario, aunque haya
-- un fallo en la web.
--   * El entrenador ve y edita solo SUS clientes.
--   * Un cliente (portal, fases 3-4) solo ve sus propios datos y puede apuntar
--     su peso. Ya queda preparado aquí.
-- Borrar un cliente borra en cascada todos sus datos (derecho de supresión).
-- =============================================================================

-- ---------- Perfiles: un perfil por usuario con su rol ----------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'cliente' check (rol in ('entrenador', 'cliente')),
  nombre text,
  email text,
  -- Marca del entrenador (para el PDF de la fase 2)
  marca_nombre text,
  marca_color text,
  created_at timestamptz not null default now()
);

-- Al crear un usuario se crea su perfil. El PRIMER usuario de la app es el
-- entrenador; los siguientes son clientes (el registro público está cerrado,
-- así que solo el entrenador puede invitar usuarios).
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, rol, email, nombre)
  values (
    new.id,
    case when exists (select 1 from public.perfiles where rol = 'entrenador') then 'cliente' else 'entrenador' end,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- ¿El usuario conectado es entrenador?
create function public.es_entrenador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'entrenador');
$$;

-- Rol del usuario conectado (función para no consultar la tabla desde su propia regla)
create function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- ---------- Clientes ----------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.perfiles (id) on delete cascade default auth.uid(),
  -- Usuario del portal (null hasta que se le dé acceso)
  usuario_id uuid unique references auth.users (id) on delete set null,

  nombre text not null,
  email text,
  telefono text,
  sexo text not null check (sexo in ('hombre', 'mujer')),
  fecha_nacimiento date not null,
  altura_cm numeric(5, 1) not null check (altura_cm between 100 and 250),
  peso_inicial_kg numeric(5, 2) not null check (peso_inicial_kg between 30 and 300),
  grasa_inicial_pct numeric(4, 1) check (grasa_inicial_pct between 3 and 60),

  objetivo text not null check (objetivo in ('perdida_grasa', 'ganancia_muscular', 'recomposicion', 'mantenimiento', 'rendimiento')),
  estilo_vida text not null default 'sedentario' check (estilo_vida in ('sedentario', 'de_pie', 'fisico')),
  pasos_diarios integer check (pasos_diarios between 0 and 50000),
  dias_entreno integer check (dias_entreno between 0 and 7),
  tipo_entreno text[] not null default '{}',

  tipo_dieta text not null default 'omnivora' check (tipo_dieta in ('omnivora', 'vegetariana', 'vegana', 'pescetariana')),
  alimentos_no_gustan text,
  alergias text,
  intolerancias text,
  comidas_al_dia integer check (comidas_al_dia between 1 and 8),
  horarios text,

  fecha_inicio date not null default current_date,
  activo boolean not null default true,
  -- Clientes ficticios de demostración (se pueden borrar de golpe)
  es_ejemplo boolean not null default false,

  -- Consentimiento expreso para tratar datos de salud (RGPD art. 9)
  consentimiento_salud boolean not null default false,
  consentimiento_fecha timestamptz,
  consentimiento_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clientes (entrenador_id);

create function public.tocar_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger clientes_updated before update on public.clientes
  for each row execute function public.tocar_updated_at();

-- ¿El usuario conectado puede gestionar este cliente (es su entrenador)?
create function public.es_mi_cliente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clientes where id = p_cliente and entrenador_id = auth.uid());
$$;

-- ¿El usuario conectado ES este cliente (portal)?
create function public.soy_cliente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clientes where id = p_cliente and usuario_id = auth.uid());
$$;

-- ---------- Notas del cliente (solo entrenador) ----------
create table public.notas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);
create index on public.notas_cliente (cliente_id, created_at desc);

-- ---------- Planes nutricionales (versiones) ----------
-- Cada vez que el entrenador cambia calorías o macros se guarda una versión
-- nueva con su motivo. Así el historial de ajustes sale de esta tabla.
create table public.planes_nutricionales (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  -- Configuración de la calculadora (fórmula, factores, ajuste, reparto...)
  config jsonb not null,
  -- Datos del cliente usados en el cálculo (peso, edad...) para poder rehacerlo
  datos_cliente jsonb not null,
  peso_referencia_kg numeric(5, 2) not null,
  media_semanal_kcal numeric(7, 1) not null,
  motivo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.planes_nutricionales (cliente_id, created_at desc);
-- Solo un plan activo por cliente
create unique index un_plan_activo on public.planes_nutricionales (cliente_id) where activo;

-- Objetivos por tipo de día de cada versión del plan
create table public.objetivos_dia (
  plan_id uuid not null references public.planes_nutricionales (id) on delete cascade,
  tipo_dia text not null check (tipo_dia in ('entreno', 'descanso', 'entreno_intenso')),
  kcal numeric(7, 1) not null,
  proteina_g numeric(6, 1) not null,
  grasa_g numeric(6, 1) not null,
  carbohidratos_g numeric(6, 1) not null,
  fibra_g numeric(5, 1) not null,
  agua_l numeric(4, 2) not null,
  primary key (plan_id, tipo_dia)
);

-- Guarda un plan nuevo y desactiva el anterior en una sola operación
create function public.guardar_plan(
  p_cliente uuid, p_config jsonb, p_datos jsonb, p_peso numeric, p_media numeric,
  p_motivo text, p_objetivos jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if not public.es_mi_cliente(p_cliente) then
    raise exception 'No autorizado';
  end if;
  update public.planes_nutricionales set activo = false where cliente_id = p_cliente and activo;
  insert into public.planes_nutricionales (cliente_id, config, datos_cliente, peso_referencia_kg, media_semanal_kcal, motivo)
  values (p_cliente, p_config, p_datos, p_peso, p_media, p_motivo)
  returning id into v_id;
  insert into public.objetivos_dia (plan_id, tipo_dia, kcal, proteina_g, grasa_g, carbohidratos_g, fibra_g, agua_l)
  select v_id, o ->> 'tipo_dia', (o ->> 'kcal')::numeric, (o ->> 'proteina_g')::numeric, (o ->> 'grasa_g')::numeric,
         (o ->> 'carbohidratos_g')::numeric, (o ->> 'fibra_g')::numeric, (o ->> 'agua_l')::numeric
  from jsonb_array_elements(p_objetivos) o;
  return v_id;
end $$;

-- ---------- Registros de peso ----------
create table public.registros_peso (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  fecha date not null,
  peso_kg numeric(5, 2) not null check (peso_kg between 30 and 300),
  nota text,
  registrado_por uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (cliente_id, fecha)
);
create index on public.registros_peso (cliente_id, fecha);

-- =============================================================================
-- Reglas de acceso (RLS)
-- =============================================================================
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.notas_cliente enable row level security;
alter table public.planes_nutricionales enable row level security;
alter table public.objetivos_dia enable row level security;
alter table public.registros_peso enable row level security;

-- Perfiles: cada uno ve y edita el suyo (sin poder cambiarse el rol)
create policy "ver mi perfil" on public.perfiles for select using (id = auth.uid());
create policy "editar mi perfil" on public.perfiles for update using (id = auth.uid())
  with check (id = auth.uid() and rol = public.mi_rol());

-- Clientes
create policy "entrenador gestiona sus clientes" on public.clientes for all
  using (entrenador_id = auth.uid() and public.es_entrenador())
  with check (entrenador_id = auth.uid() and public.es_entrenador());
create policy "cliente ve su ficha" on public.clientes for select using (usuario_id = auth.uid());

-- Notas: solo el entrenador
create policy "entrenador gestiona notas" on public.notas_cliente for all
  using (public.es_mi_cliente(cliente_id)) with check (public.es_mi_cliente(cliente_id));

-- Planes y objetivos: el entrenador todo; el cliente solo lee
create policy "entrenador gestiona planes" on public.planes_nutricionales for all
  using (public.es_mi_cliente(cliente_id)) with check (public.es_mi_cliente(cliente_id));
create policy "cliente ve sus planes" on public.planes_nutricionales for select
  using (public.soy_cliente(cliente_id));

create policy "entrenador gestiona objetivos" on public.objetivos_dia for all
  using (exists (select 1 from public.planes_nutricionales p where p.id = plan_id and public.es_mi_cliente(p.cliente_id)))
  with check (exists (select 1 from public.planes_nutricionales p where p.id = plan_id and public.es_mi_cliente(p.cliente_id)));
create policy "cliente ve sus objetivos" on public.objetivos_dia for select
  using (exists (select 1 from public.planes_nutricionales p where p.id = plan_id and public.soy_cliente(p.cliente_id)));

-- Peso: el entrenador todo; el cliente ve y apunta el suyo
create policy "entrenador gestiona pesos" on public.registros_peso for all
  using (public.es_mi_cliente(cliente_id)) with check (public.es_mi_cliente(cliente_id));
create policy "cliente ve sus pesos" on public.registros_peso for select using (public.soy_cliente(cliente_id));
create policy "cliente apunta su peso" on public.registros_peso for insert with check (public.soy_cliente(cliente_id));
create policy "cliente corrige su peso" on public.registros_peso for update
  using (public.soy_cliente(cliente_id)) with check (public.soy_cliente(cliente_id));

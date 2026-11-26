-- =============================================================================
-- Formulario de alta: el entrenador genera un enlace único, el cliente lo
-- rellena SIN tener cuenta y el entrenador revisa las respuestas y crea la
-- ficha con un clic.
--
-- Seguridad:
--   * La tabla tiene RLS: solo el entrenador que creó el enlace la ve.
--   * Quien no ha iniciado sesión NO puede leer la tabla. Solo puede usar dos
--     funciones, y siempre con el código secreto del enlace:
--       - ver_formulario_alta: saber si el enlace es válido.
--       - enviar_formulario_alta: guardar sus respuestas UNA vez.
--   * El enlace caduca a los 30 días y deja de servir una vez enviado.
--   * Al borrar el cliente se borran también sus respuestas (RGPD).
-- =============================================================================

create table public.formularios_alta (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.perfiles (id) on delete cascade default auth.uid(),
  -- Código secreto que va en el enlace
  token uuid not null unique default gen_random_uuid(),
  -- Nombre que pone el entrenador para reconocer el enlace (opcional)
  nombre_previsto text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'recibido', 'convertido')),
  respuestas jsonb,
  -- Consentimiento RGPD que da el propio cliente al enviar
  consentimiento_fecha timestamptz,
  consentimiento_version text,
  enviado_at timestamptz,
  -- Ficha creada a partir de este formulario
  cliente_id uuid unique references public.clientes (id) on delete cascade,
  caduca_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
create index on public.formularios_alta (entrenador_id, created_at desc);

alter table public.formularios_alta enable row level security;

create policy "entrenador gestiona sus formularios" on public.formularios_alta for all
  using (entrenador_id = auth.uid() and public.es_entrenador())
  with check (entrenador_id = auth.uid() and public.es_entrenador());

grant select, insert, update, delete on public.formularios_alta to authenticated;

-- ¿Es válido este enlace? (lo usa la página pública del formulario)
create function public.ver_formulario_alta(p_token uuid)
returns table (estado text, nombre_previsto text, entrenador text, caducado boolean)
language sql stable security definer set search_path = public as $$
  select f.estado,
         f.nombre_previsto,
         coalesce(p.marca_nombre, p.nombre),
         f.caduca_at < now()
  from public.formularios_alta f
  join public.perfiles p on p.id = f.entrenador_id
  where f.token = p_token;
$$;

-- Guarda las respuestas del cliente. Solo funciona una vez por enlace y si no
-- ha caducado. Devuelve true si se guardó.
create function public.enviar_formulario_alta(p_token uuid, p_respuestas jsonb, p_version text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_filas integer;
begin
  if p_respuestas is null or jsonb_typeof(p_respuestas) <> 'object' then
    raise exception 'Respuestas no válidas';
  end if;
  -- Límite de tamaño para que nadie llene la base de datos
  if octet_length(p_respuestas::text) > 50000 then
    raise exception 'Respuestas demasiado largas';
  end if;
  update public.formularios_alta
     set estado = 'recibido',
         respuestas = p_respuestas,
         consentimiento_fecha = now(),
         consentimiento_version = left(p_version, 40),
         enviado_at = now()
   where token = p_token and estado = 'pendiente' and caduca_at >= now();
  get diagnostics v_filas = row_count;
  return v_filas = 1;
end $$;

-- Por defecto Postgres deja usar cualquier función a todo el mundo: lo
-- limitamos a estas dos para los visitantes sin sesión (anon).
grant usage on schema public to anon;
revoke execute on function public.ver_formulario_alta(uuid) from public;
revoke execute on function public.enviar_formulario_alta(uuid, jsonb, text) from public;
grant execute on function public.ver_formulario_alta(uuid) to anon, authenticated;
grant execute on function public.enviar_formulario_alta(uuid, jsonb, text) to anon, authenticated;

-- =============================================================================
-- Medidas corporales: opcionales y en cualquier momento. Las puede apuntar el
-- entrenador desde la ficha o el propio cliente (portal, fase 3). Si el
-- cliente las puso en el formulario de alta, se guardan aquí como las primeras.
-- =============================================================================
create table public.medidas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  fecha date not null,
  cintura_cm numeric(5, 1) check (cintura_cm between 40 and 200),
  cadera_cm numeric(5, 1) check (cadera_cm between 50 and 200),
  pecho_cm numeric(5, 1) check (pecho_cm between 50 and 200),
  brazo_cm numeric(5, 1) check (brazo_cm between 15 and 70),
  muslo_cm numeric(5, 1) check (muslo_cm between 25 and 100),
  nota text,
  registrado_por uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (cliente_id, fecha),
  -- Al menos una medida
  check (coalesce(cintura_cm, cadera_cm, pecho_cm, brazo_cm, muslo_cm) is not null)
);
create index on public.medidas (cliente_id, fecha);

alter table public.medidas enable row level security;

create policy "entrenador gestiona medidas" on public.medidas for all
  using (public.es_mi_cliente(cliente_id)) with check (public.es_mi_cliente(cliente_id));
create policy "cliente ve sus medidas" on public.medidas for select using (public.soy_cliente(cliente_id));
create policy "cliente apunta sus medidas" on public.medidas for insert with check (public.soy_cliente(cliente_id));
create policy "cliente corrige sus medidas" on public.medidas for update
  using (public.soy_cliente(cliente_id)) with check (public.soy_cliente(cliente_id));

grant select, insert, update, delete on public.medidas to authenticated;

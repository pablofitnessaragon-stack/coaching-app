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

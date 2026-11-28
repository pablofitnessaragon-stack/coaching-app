-- =============================================================================
-- Acceso de clientes al portal: revisión de seguridad (RGPD).
--
-- Antes, un cliente veía sus datos en cuanto su cuenta quedaba enlazada a la
-- ficha (clientes.usuario_id), y no había forma de "cerrar el grifo" sin borrar
-- el enlace a mano en la base de datos. Ahora:
--
--   * Nueva columna clientes.acceso_portal (por defecto NO). El cliente solo ve
--     sus datos si su cuenta está enlazada Y el entrenador le ha dado acceso.
--     Si se lo quita, deja de ver todo al instante (la cuenta sigue enlazada
--     para poder devolvérselo con un clic).
--   * dar_acceso_portal(cliente, email): el entrenador enlaza la cuenta del
--     cliente por su email y activa el acceso. Solo enlaza cuentas de tipo
--     "cliente" con el email confirmado; nunca la del entrenador.
--   * quitar_acceso_portal(cliente): desactiva el acceso.
--   * Defensa extra: es_mi_cliente() exige además ser entrenador, y
--     "registrado_por" en pesos y medidas lo pone siempre la base de datos
--     (nadie puede hacerse pasar por otro).
-- =============================================================================

alter table public.clientes add column acceso_portal boolean not null default false;

-- Los clientes ya enlazados (si los hubiera) conservan el acceso que tenían.
update public.clientes set acceso_portal = true where usuario_id is not null;

-- ¿El usuario conectado ES este cliente y tiene el acceso activado?
create or replace function public.soy_cliente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clientes
    where id = p_cliente and usuario_id = auth.uid() and acceso_portal
  );
$$;

-- ¿El usuario conectado es el entrenador de este cliente?
create or replace function public.es_mi_cliente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_entrenador()
     and exists (select 1 from public.clientes where id = p_cliente and entrenador_id = auth.uid());
$$;

-- La ficha: el cliente solo la ve con el acceso activado
drop policy "cliente ve su ficha" on public.clientes;
create policy "cliente ve su ficha" on public.clientes for select using (public.soy_cliente(id));

-- ---------- Dar y quitar acceso ----------
create function public.dar_acceso_portal(p_cliente uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_usuario uuid;
  v_otro uuid;
begin
  if not public.es_mi_cliente(p_cliente) then
    raise exception 'No autorizado';
  end if;

  select u.id into v_usuario
    from auth.users u
    join public.perfiles p on p.id = u.id
   where lower(u.email) = lower(trim(p_email))
     and p.rol = 'cliente'
     and u.email_confirmed_at is not null;
  if v_usuario is null then
    return 'sin_cuenta';
  end if;

  select id into v_otro from public.clientes where usuario_id = v_usuario and id <> p_cliente;
  if v_otro is not null then
    return 'cuenta_ocupada';
  end if;

  update public.clientes set usuario_id = v_usuario, acceso_portal = true where id = p_cliente;
  return 'ok';
end $$;

create function public.quitar_acceso_portal(p_cliente uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mi_cliente(p_cliente) then
    raise exception 'No autorizado';
  end if;
  update public.clientes set acceso_portal = false where id = p_cliente;
end $$;

revoke execute on function public.dar_acceso_portal(uuid, text) from public, anon;
revoke execute on function public.quitar_acceso_portal(uuid) from public, anon;
grant execute on function public.dar_acceso_portal(uuid, text) to authenticated;
grant execute on function public.quitar_acceso_portal(uuid) to authenticated;

-- ---------- "registrado_por" lo pone siempre la base de datos ----------
-- Al crear un registro es quien está conectado; al corregirlo no cambia.
create function public.poner_registrado_por() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.registrado_por = auth.uid();
  else
    new.registrado_por = old.registrado_por;
  end if;
  return new;
end $$;

create trigger pesos_registrado_por before insert or update on public.registros_peso
  for each row execute function public.poner_registrado_por();
create trigger medidas_registrado_por before insert or update on public.medidas
  for each row execute function public.poner_registrado_por();

-- Perfil: cada uno puede cambiar su nombre (y el entrenador su marca), pero no
-- su email ni su rol.
revoke update on public.perfiles from authenticated;
grant update (nombre, marca_nombre, marca_color) on public.perfiles to authenticated;

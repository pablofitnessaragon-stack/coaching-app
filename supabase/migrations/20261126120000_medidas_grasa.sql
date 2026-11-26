-- =============================================================================
-- % de grasa en las medidas:
--   * cuello_cm: necesario para estimar el % de grasa con la fórmula de la
--     Marina (cuello + cintura + cadera en mujeres + altura). La estimación se
--     calcula en la app, no se guarda.
--   * grasa_pct y grasa_metodo: % medido con báscula de bioimpedancia, DEXA...
-- Todo sigue siendo opcional; basta con apuntar un dato.
-- =============================================================================
alter table public.medidas
  add column cuello_cm numeric(5, 1) check (cuello_cm between 20 and 70),
  add column grasa_pct numeric(4, 1) check (grasa_pct between 3 and 60),
  add column grasa_metodo text check (grasa_metodo in ('bioimpedancia', 'dexa', 'plicometro', 'otro'));

-- La regla "al menos una medida" ahora incluye cuello y % de grasa
do $$
declare v_nombre text;
begin
  select conname into v_nombre from pg_constraint
   where conrelid = 'public.medidas'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%coalesce%';
  if v_nombre is not null then
    execute format('alter table public.medidas drop constraint %I', v_nombre);
  end if;
end $$;

alter table public.medidas add constraint medidas_al_menos_una
  check (coalesce(cuello_cm, cintura_cm, cadera_cm, pecho_cm, brazo_cm, muslo_cm, grasa_pct) is not null);

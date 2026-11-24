-- Los proyectos nuevos de Supabase ya no dan permisos automáticos sobre las
-- tablas nuevas. Los usuarios conectados necesitan poder leer/escribir; las
-- reglas RLS siguen decidiendo QUÉ filas ve cada uno. Los anónimos, nada.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

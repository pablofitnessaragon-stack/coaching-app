# Puesta en marcha (publicar la app)

Unos 20 minutos. Solo hay que hacerlo una vez.

## 1. Base de datos: Supabase (gratis)

1. Crea una cuenta en <https://supabase.com> (puedes entrar con GitHub).
2. *New project* → nombre `coaching`, contraseña segura (guárdala), **Region: Central EU (Frankfurt)**.
3. Cuando esté listo: menú **SQL Editor** → *New query* → pega todo el contenido de
   `supabase/migrations/20261124000000_fase1.sql` → *Run*. Debe decir "Success".
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*
   (así nadie puede registrarse por su cuenta).
5. **Authentication → Users → Add user → Create new user**: tu email y una contraseña.
   Marca *Auto Confirm User*. El primer usuario creado es automáticamente el entrenador.
6. **Project Settings → API Keys**: copia la *Project URL* y la clave *publishable*.

## 2. Web: Vercel

1. Crea una cuenta en <https://vercel.com> entrando con GitHub.
2. *Add New → Project* → importa `coaching-app`.
3. En *Environment Variables* añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = la clave publishable
4. *Deploy*. En un par de minutos tendrás un enlace tipo `coaching-app-xxx.vercel.app`.
5. En Vercel, *Settings → Functions → Function Region*: elige **Frankfurt (fra1)** para que los
   datos no salgan de la UE.
6. En Supabase, **Authentication → URL Configuration → Site URL**: pon ese enlace.

## 3. Probar

Entra con tu email, ve a **Ajustes → Cargar clientes de ejemplo** y explora. Cuando quieras empezar
con clientes reales, **Ajustes → Borrar clientes de ejemplo**.

## Notas

- El plan gratis de Supabase pausa el proyecto si nadie entra en 7 días; se reactiva desde su web.
- El plan gratis de Vercel (Hobby) es para uso no comercial; cuando trabajes con clientes de pago,
  pasa a Pro o usa Netlify/Cloudflare.
- Firma el acuerdo de tratamiento de datos (DPA) de Supabase y Vercel desde sus webs (RGPD).

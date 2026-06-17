-- ============================================================================
--  3dar · microsite — Esquema de base de datos (Supabase / PostgreSQL)
--  Pegá TODO esto en:  Supabase → tu proyecto → SQL Editor → New query → Run
-- ============================================================================

-- 1) Tabla de productos -------------------------------------------------------
create table if not exists public.productos (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  orden           int not null default 100,           -- para ordenar el catálogo
  nombre          text not null,
  modelo          text default '',
  categoria       text default 'Otros',
  unidades        int not null default 1,
  precio_usd      numeric not null default 0,
  precio_lista_usd numeric,                            -- opcional → activa "Descuento"
  comentario      text default '',
  tipo            text,                                -- null = normal, 'combo' = combo
  componentes     jsonb not null default '[]'::jsonb,  -- lista de strings (combos)
  fotos           jsonb not null default '[]'::jsonb,  -- lista de URLs públicas
  publicado       boolean not null default true
);

-- 2) Tabla de configuración del sitio (una sola fila) ------------------------
create table if not exists public.config (
  id              int primary key default 1,
  titulo          text default '3dar · Liquidación de equipamiento',
  subtitulo       text default '',
  whatsapp_numero text default '',
  retiro          text default '',
  dolar_api       text default 'https://dolarapi.com/v1/dolares/blue',
  dolar_fallback  numeric default 1300,
  nota_precios    text default '',
  constraint config_single_row check (id = 1)
);
insert into public.config (id) values (1) on conflict (id) do nothing;

-- 2b) Lista de administradores (login con Google restringido a estos emails) ---
create table if not exists public.admins ( email text primary key );
-- ⬇⬇ CAMBIÁ esto por tu Gmail / email de Google real (con el que vas a entrar):
insert into public.admins (email) values ('alvaro@3dar.com') on conflict do nothing;
-- RLS sin policies → la tabla NO es accesible por la API; solo la usa la función de abajo.
alter table public.admins enable row level security;

-- Función que dice si el usuario logueado es admin (corre con privilegios, sin RLS).
create or replace function public.es_admin() returns boolean
  language sql security definer stable
  as $$ select exists (select 1 from public.admins a where a.email = (auth.jwt() ->> 'email')); $$;

-- 3) Seguridad (RLS): el público SOLO lee; editar requiere estar logueado -----
alter table public.productos enable row level security;
alter table public.config    enable row level security;

-- Lectura pública
drop policy if exists "lectura publica productos" on public.productos;
create policy "lectura publica productos" on public.productos
  for select using (true);

drop policy if exists "lectura publica config" on public.config;
create policy "lectura publica config" on public.config
  for select using (true);

-- Escritura solo para usuarios autenticados (el administrador)
drop policy if exists "admin escribe productos" on public.productos;
create policy "admin escribe productos" on public.productos
  for all using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "admin escribe config" on public.config;
create policy "admin escribe config" on public.config
  for all using (public.es_admin())
  with check (public.es_admin());

-- 4) Almacenamiento de fotos (bucket público "fotos") ------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- Cualquiera puede VER las fotos
drop policy if exists "ver fotos publico" on storage.objects;
create policy "ver fotos publico" on storage.objects
  for select using (bucket_id = 'fotos');

-- Solo el admin logueado puede subir / cambiar / borrar fotos
drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and public.es_admin());

drop policy if exists "admin edita fotos" on storage.objects;
create policy "admin edita fotos" on storage.objects
  for update using (bucket_id = 'fotos' and public.es_admin());

drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects
  for delete using (bucket_id = 'fotos' and public.es_admin());

-- ============================================================================
--  Listo. El login es con GOOGLE (ver nube/DEPLOY.md). Solo los emails de la
--  tabla `admins` pueden editar. Para sumar otro admin:
--      insert into public.admins (email) values ('otra@gmail.com');
-- ============================================================================

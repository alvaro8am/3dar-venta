-- ============================================================================
--  3dar · microsite — Registro de ventas
--  Pegá TODO esto en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

-- Marca de vendido + los datos de la venta ------------------------------------
alter table public.productos add column if not exists vendido          boolean not null default false;
alter table public.productos add column if not exists precio_venta_usd numeric;   -- a cuánto se vendió
alter table public.productos add column if not exists medio_venta      text;      -- por qué medio (WhatsApp, MercadoLibre…)
alter table public.productos add column if not exists fecha_venta      date;      -- cuándo
alter table public.productos add column if not exists nota_venta       text default '';  -- comprador, forma de pago, lo que sea

-- Las policies de `productos` son `for all`, así que ya cubren estas columnas:
-- el público las lee, y solo un admin logueado puede escribirlas.

-- Para que la sección "Vendidos" del panel ordene rápido ----------------------
create index if not exists productos_vendido_idx on public.productos (vendido);

-- ============================================================================
--  Listo. El panel (admin.html) ya puede marcar ventas y el sitio público
--  deja de mostrar lo vendido.
-- ============================================================================

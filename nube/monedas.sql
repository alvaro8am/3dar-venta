-- ============================================================================
--  3dar · microsite — Precios y ventas en USD o en ARS
--  Pegá TODO esto en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

-- 1) Moneda en la que está FIJADO el precio del producto ----------------------
--    'USD' (por defecto): el sitio lo convierte a pesos con el dólar del día.
--    'ARS': el precio en pesos es fijo y no se mueve con el dólar.
alter table public.productos add column if not exists moneda           text not null default 'USD';
alter table public.productos add column if not exists precio_ars       numeric;  -- precio cuando moneda = 'ARS'
alter table public.productos add column if not exists precio_lista_ars numeric;  -- precio lista (tachado) en ARS

-- 2) Moneda en la que se COBRÓ la venta --------------------------------------
--    precio_venta_usd ya existe y queda como el valor normalizado en dólares:
--    es el que suma en los totales del panel, sea cual sea la moneda cobrada.
alter table public.productos add column if not exists precio_venta_monto  numeric;       -- lo que se cobró, tal cual
alter table public.productos add column if not exists precio_venta_moneda text default 'USD';
alter table public.productos add column if not exists dolar_venta         numeric;       -- cotización usada para pasarlo a USD

-- 3) Que la moneda solo pueda ser una de las dos ------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_moneda_chk') then
    alter table public.productos add constraint productos_moneda_chk check (moneda in ('USD','ARS'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'productos_venta_moneda_chk') then
    alter table public.productos add constraint productos_venta_moneda_chk check (precio_venta_moneda in ('USD','ARS'));
  end if;
end $$;

-- ============================================================================
--  Los productos que ya existen quedan en 'USD', exactamente como estaban.
-- ============================================================================

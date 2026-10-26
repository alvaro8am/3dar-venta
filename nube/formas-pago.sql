-- ============================================================================
--  3dar · microsite — Forma de pago de la venta
--  Pegá TODO esto en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

-- Cómo pagaron, y si fue transferencia, a qué cuenta entró la plata.
-- Ojo que esto es distinto de medio_venta: ese es por dónde apareció el
-- comprador (WhatsApp, MercadoLibre…), esto es cómo terminó pagando.
alter table public.productos add column if not exists forma_pago     text;  -- 'Efectivo' | 'Transferencia'
alter table public.productos add column if not exists cuenta_destino text;  -- solo cuando es transferencia

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'productos_forma_pago_chk') then
    alter table public.productos add constraint productos_forma_pago_chk
      check (forma_pago in ('Efectivo','Transferencia'));
  end if;
end $$;

-- ============================================================================
--  Las ventas que ya estén cargadas quedan con forma_pago en null, que el
--  panel muestra como "sin especificar".
-- ============================================================================

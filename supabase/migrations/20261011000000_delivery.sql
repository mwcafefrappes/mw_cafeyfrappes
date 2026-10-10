-- Domicilio (Fase 6, CLAUDE.md 5.1 y 5.4). Se paga solo con tarjeta
-- (Stripe); esta migración deja lista la parte que no depende del cobro.
--
-- Reglas confirmadas por el usuario (2026-10-09):
-- - Zona de entrega: radio en km desde el local (5 km, editable).
-- - El cliente marca su casa con un pin en un mapa (además de calle,
--   colonia y referencias).
-- - Envío manual: el pedido llega al tablero sin envío; el personal lo
--   fija y el cliente paga desde /pedido/<token>.
-- - Un pedido con tarjeta sin pagar no se ve en el tablero; si no se paga
--   en 1 hora, se cancela solo.

alter table business_settings
  add column delivery_radius_m integer not null default 5000 check (delivery_radius_m between 100 and 50000);

comment on column business_settings.delivery_radius_m is 'Radio de entrega a domicilio en metros, en línea recta desde business_lat/business_lng. Editable en /admin/negocio (en km).';

alter table orders
  add column delivery_address text check (length(delivery_address) between 1 and 160),
  add column delivery_references text check (length(delivery_references) <= 200),
  add column delivery_lat double precision check (delivery_lat between -90 and 90),
  add column delivery_lng double precision check (delivery_lng between -180 and 180),
  add column delivery_distance_m integer check (delivery_distance_m >= 0),
  -- false mientras un pedido con tarjeta no se paga: el tablero no lo muestra.
  add column on_board boolean not null default true,
  add constraint orders_delivery_fields check (
    (type = 'delivery') = (delivery_address is not null and delivery_lat is not null and delivery_lng is not null)
  ),
  add constraint orders_delivery_phone check (type <> 'delivery' or customer_phone is not null);

-- 'system' = se canceló solo (tarjeta sin pagar a tiempo).
alter table orders drop constraint orders_cancelled_by_check;
alter table orders add constraint orders_cancelled_by_check check (cancelled_by in ('customer', 'staff', 'system'));

create index orders_unpaid_idx on orders (created_at) where on_board = false and status = 'received';

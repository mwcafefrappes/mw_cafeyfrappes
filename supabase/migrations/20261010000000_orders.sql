-- Pedidos (Fase 5, CLAUDE.md sección 5). Mostrador y mesa con efectivo o
-- transferencia; domicilio y tarjeta llegan con Stripe (Fase 6), pero los
-- valores ya se aceptan aquí para no cambiar el esquema después.
--
-- Reglas confirmadas por el usuario (2026-10-08):
-- - Número por día (#1, #2…), del día en que se entrega (`service_day`).
-- - Mesa solo "ahora"; programado solo para recoger.
-- - Transferencia: el cliente sube su comprobante; no se prepara hasta
--   que el personal marca el pago como recibido.
-- - El cliente puede cancelar mientras el pedido siga "recibido".
--
-- Precios en centavos. El total lo calcula el servidor desde la BD.

create table orders (
  id uuid primary key default gen_random_uuid(),
  -- Único "login" del cliente para ver su pedido en /pedido/<token>.
  token text not null unique check (length(token) >= 24),
  service_day date not null,
  number integer not null check (number >= 1),
  type text not null check (type in ('pickup', 'table', 'delivery')),
  table_number smallint check (table_number between 1 and 99),
  customer_name text not null check (length(customer_name) between 1 and 60),
  -- 52 + 10 dígitos (formato de wa.me).
  customer_phone text check (customer_phone ~ '^52[0-9]{10}$'),
  -- null = "lo antes posible".
  scheduled_for timestamptz,
  status text not null default 'received' check (status in ('received', 'preparing', 'ready', 'delivered', 'cancelled')),
  cancelled_by text check (cancelled_by in ('customer', 'staff')),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'card')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  -- Comprobante de transferencia (bucket privado `payment-proofs`).
  payment_proof_path text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  note text check (length(note) <= 280),
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_day, number),
  check ((type = 'table') = (table_number is not null)),
  check (type <> 'table' or scheduled_for is null),
  check ((status = 'cancelled') = (cancelled_by is not null))
);

create index orders_active_idx on orders (status, service_day);
create index orders_scheduled_idx on orders (scheduled_for) where scheduled_for is not null;

comment on table orders is 'Pedidos. El cliente los ve con su token en /pedido/<token>; el personal en /admin/pedidos. Escritura solo desde el servidor (service_role).';

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  -- Copia de nombres y precios al momento de pedir: si después cambia el
  -- menú, el pedido sigue diciendo lo que se pidió.
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  size_name text,
  -- [{ "name": "Crema batida", "price_cents": 1500 }, …]
  extras jsonb not null default '[]'::jsonb,
  unit_cents integer not null check (unit_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_cents integer not null check (line_cents >= 0),
  note text check (length(note) <= 140),
  sort_order integer not null default 0
);

create index order_items_order_idx on order_items (order_id, sort_order);

-- Número del día sin carreras: un renglón por día con el último número.
create table order_day_counters (
  day date primary key,
  last_number integer not null default 0
);

create function next_order_number(p_day date) returns integer
language sql
set search_path = public
as $$
  insert into order_day_counters (day, last_number) values (p_day, 1)
  on conflict (day) do update set last_number = order_day_counters.last_number + 1
  returning last_number;
$$;

revoke execute on function next_order_number(date) from public, anon, authenticated;

-- RLS: el cliente nunca lee la tabla directo (pasa por el servidor con su
-- token). Las cuentas del panel sí pueden leer, para el tablero en vivo
-- (Supabase Realtime respeta estas políticas).
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_day_counters enable row level security;

create policy "orders_admin_read" on orders
  for select to authenticated
  using (exists (select 1 from admin_users a where a.user_id = auth.uid()));

create policy "order_items_admin_read" on order_items
  for select to authenticated
  using (exists (select 1 from admin_users a where a.user_id = auth.uid()));

alter publication supabase_realtime add table orders;

-- Comprobantes de transferencia: privados (datos bancarios del cliente).
-- Solo el servidor sube (con el token del pedido) y el panel los ve con
-- URLs firmadas que caducan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Métricas de /admin/metricas (Fase 4, confirmado 2026-10-08): contadores
-- propios por día, sin datos de personas ni cookies.
--   menu_view    key = número de mesa del QR ('' = sin mesa: mostrador, publicidad, link)
--   product_view key = id del producto (se abrió su detalle)
--   link_click   key = whatsapp | instagram | facebook | maps
-- Un renglón por día + métrica + clave: unos cuantos KB al mes.

create table metric_counts (
  day date not null,
  metric text not null check (metric in ('menu_view', 'product_view', 'link_click')),
  key text not null default '',
  count integer not null default 0 check (count >= 0),
  primary key (day, metric, key)
);

comment on table metric_counts is 'Conteos diarios (hora de México) para /admin/metricas. Solo se escribe desde /api/metrics con service_role.';

-- Sin políticas: ni anon ni authenticated leen ni escriben; solo service_role.
alter table metric_counts enable row level security;

-- Suma 1 al conteo de hoy (hora de México) sin carreras entre visitas simultáneas.
create function increment_metric(p_metric text, p_key text) returns void
language sql
set search_path = public
as $$
  insert into metric_counts (day, metric, key, count)
  values ((now() at time zone 'America/Mexico_City')::date, p_metric, p_key, 1)
  on conflict (day, metric, key) do update set count = metric_counts.count + 1;
$$;

revoke execute on function increment_metric(text, text) from public, anon, authenticated;

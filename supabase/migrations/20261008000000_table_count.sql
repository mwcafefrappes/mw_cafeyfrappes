-- Número de mesas (P12): de aquí salen los QR de cada mesa en /admin/qr.
-- 6 por ahora (2026-10-08), editable desde el panel.
alter table business_settings
  add column table_count smallint not null default 6 check (table_count between 1 and 99);

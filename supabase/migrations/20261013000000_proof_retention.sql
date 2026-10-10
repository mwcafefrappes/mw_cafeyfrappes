-- Cuánto tiempo se guardan los comprobantes de transferencia (decisión del
-- usuario, 2026-10-09): 90 días por defecto, editable en /admin/negocio.
-- El cron diario borra las capturas más viejas; el pedido se queda (para
-- el historial y las métricas).

alter table business_settings
  add column proof_retention_days integer not null default 90 check (proof_retention_days between 7 and 3650);

comment on column business_settings.proof_retention_days is 'Días que se guarda la captura del comprobante de transferencia de un pedido. La borra el cron diario.';

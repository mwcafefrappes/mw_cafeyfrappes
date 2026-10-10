/**
 * Cuánto se guardan los comprobantes de transferencia (decisión del
 * 2026-10-09: 90 días por defecto, editable en /admin/negocio). Puro.
 */

export const DEFAULT_PROOF_RETENTION_DAYS = 90;
export const MIN_PROOF_RETENTION_DAYS = 7;
export const MAX_PROOF_RETENTION_DAYS = 3650;

/** Los comprobantes de pedidos hechos antes de esta fecha se borran. */
export function proofCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

/** Lee los días que escribió el personal; `null` si no es un número entero válido. */
export function parseRetentionDays(raw: string): number | null {
  const value = Number(raw.trim());
  if (!raw.trim() || !Number.isInteger(value) || value < MIN_PROOF_RETENTION_DAYS || value > MAX_PROOF_RETENTION_DAYS) return null;
  return value;
}

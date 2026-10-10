/**
 * Distancias para la zona de entrega a domicilio (radio desde el local,
 * decisión del 2026-10-09). En línea recta: no depende de ningún servicio
 * de mapas de pago.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

export function isLatLng(value: unknown): value is LatLng {
  if (typeof value !== "object" || value === null) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/** "850 m" o "3.2 km". */
export function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = Math.round(meters / 100) / 10;
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

/** Enlace para abrir el punto en Google Maps (gratis, sin llave). */
export function mapsPointUrl(point: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

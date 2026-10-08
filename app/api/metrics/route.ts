/**
 * Recibe los conteos del navegador (`app/track.ts`, con `sendBeacon`) y suma
 * 1 en `metric_counts`. Valida métrica y clave (`lib/metrics.ts`); lo que no
 * sea válido se ignora en silencio. No se cuenta a un navegador que tenga
 * la cookie de Supabase Auth (alguien entró al panel desde ahí; la cookie
 * puede quedar aun después de salir), para que las pruebas y los teléfonos
 * del negocio no inflen los números.
 */

import { NextResponse, type NextRequest } from "next/server";
import { normalizeMetricKey } from "@/lib/metrics";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 200;

function hasAdminSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}

export async function POST(request: NextRequest) {
  const accepted = new NextResponse(null, { status: 204 });
  if (hasAdminSession(request)) return accepted;

  const body = await request.text();
  if (body.length > MAX_BODY_CHARS) return accepted;
  let parsed: { m?: unknown; k?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return accepted;
  }
  const valid = normalizeMetricKey(parsed.m, parsed.k);
  if (!valid) return accepted;

  const { error } = await getServiceSupabase().rpc("increment_metric", { p_metric: valid.metric, p_key: valid.key });
  if (error) console.error("[metrics] no se pudo sumar", error);
  return accepted;
}

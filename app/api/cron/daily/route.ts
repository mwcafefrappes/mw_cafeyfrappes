/**
 * Cron diario de Vercel (`vercel.json`; Hobby permite uno solo):
 * - toca la base para que Supabase Free no se pause tras 7 días sin
 *   actividad;
 * - borra las capturas de comprobantes más viejas que
 *   `proof_retention_days` (90 por defecto, editable en /admin/negocio).
 * Aquí se irán juntando las tareas diarias (token de Instagram, Fase 7).
 */

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/business";
import { proofCutoff } from "@/lib/retention";
import { PAYMENT_PROOFS_BUCKET } from "@/lib/storage";
import { getServiceSupabase } from "@/lib/supabase";

/** Por corrida: si hubiera más, se siguen borrando al día siguiente. */
const MAX_PROOFS_PER_RUN = 500;

/** Borra las capturas viejas y deja el pedido sin comprobante. Regresa cuántas se borraron. */
async function deleteOldProofs(retentionDays: number, now: Date): Promise<number> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("id, payment_proof_path")
    .not("payment_proof_path", "is", null)
    .lt("created_at", proofCutoff(now, retentionDays).toISOString())
    .limit(MAX_PROOFS_PER_RUN);
  if (error) throw error;
  if (data.length === 0) return 0;

  const { error: removeError } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).remove(data.map((o) => o.payment_proof_path!));
  if (removeError) throw removeError;
  const { error: updateError } = await supabase
    .from("orders")
    .update({ payment_proof_path: null })
    .in("id", data.map((o) => o.id));
  if (updateError) throw updateError;
  return data.length;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: settings, error } = await getServiceSupabase().from("business_settings").select("proof_retention_days").eq("id", 1).single();
  if (error) {
    console.error("[cron] keep-alive falló", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  try {
    const proofsDeleted = await deleteOldProofs(settings.proof_retention_days, new Date());
    return NextResponse.json({ ok: true, proofsDeleted });
  } catch (cleanupError) {
    console.error("[cron] no se pudieron borrar comprobantes viejos", cleanupError);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

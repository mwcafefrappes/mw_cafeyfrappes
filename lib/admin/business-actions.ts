"use server";

/**
 * Server Actions de /admin/negocio y /admin/horario (las dos editan
 * `business_settings`). Cada tarjeta del panel guarda solo su sección
 * (`section` en el formulario); la validación está en `business-form.ts`.
 * Los cambios afectan todo el sitio (contacto, mapa, horario, SEO en el
 * layout), así que se regenera completo.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "../config/business";
import { getServiceSupabase } from "../supabase";
import { LONG_CACHE_CONTROL, SITE_ASSETS_BUCKET } from "../storage";
import { requireAdminUser } from "./auth";
import { getBusinessSettingsAdmin } from "./data";
import {
  parseContactSection,
  parseHoursSection,
  parseLocationSection,
  parseOrdersSection,
  parsePaymentsSection,
  parseScheduledSection,
  parseSiteSection,
  parseTimeFormatSection,
} from "./business-form";
import type { FormResult } from "./menu-form";
import type { TablesUpdate } from "../database.types";

const PATH = "/admin/negocio";
const HOURS_PATH = "/admin/horario";

function fail(message: string, path = PATH): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function succeed(message: string, anchor: string, path = PATH): never {
  redirect(`${path}?saved=${encodeURIComponent(message)}#${anchor}`);
}

type Section = { label: string; path: string; parse: (form: FormData) => FormResult<TablesUpdate<"business_settings">> };

const SECTIONS: Record<string, Section> = {
  contacto: { label: "Contacto y redes", path: PATH, parse: parseContactSection },
  ubicacion: { label: "Ubicación", path: PATH, parse: parseLocationSection },
  pedidos: { label: "Tipos de pedido y envío", path: PATH, parse: (form) => parseOrdersSection(form, env.stripeReady) },
  pagos: { label: "Métodos de pago", path: PATH, parse: (form) => parsePaymentsSection(form, env.stripeReady) },
  programados: { label: "Pedidos programados", path: PATH, parse: parseScheduledSection },
  sitio: { label: "Sitio y Google", path: PATH, parse: parseSiteSection },
  dias: { label: "Días y horas", path: HOURS_PATH, parse: parseHoursSection },
  formato: { label: "Cómo se escribe la hora", path: HOURS_PATH, parse: parseTimeFormatSection },
};

async function updateSettings(values: TablesUpdate<"business_settings">) {
  const { error } = await getServiceSupabase()
    .from("business_settings")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function saveBusinessSectionAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const key = String(formData.get("section") ?? "");
  const section = SECTIONS[key];
  if (!section) fail("Sección desconocida.");

  const parsed = section.parse(formData);
  if (!parsed.ok) fail(parsed.error, section.path);
  await updateSettings(parsed.value);
  succeed(`${section.label}: guardado.`, key, section.path);
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadLogoAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) fail("Elige una imagen para el ícono.");
  const extension = LOGO_TYPES[file.type];
  if (!extension) fail("El ícono debe ser PNG, JPG o WebP.");
  if (file.size > MAX_LOGO_BYTES) fail("La imagen pesa demasiado (máximo 2 MB).");

  const supabase = getServiceSupabase();
  const path = `logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(SITE_ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: LONG_CACHE_CONTROL });
  if (uploadError) throw uploadError;

  const previous = await getBusinessSettingsAdmin();
  await updateSettings({ logo_path: path });
  if (previous.logo_path) await supabase.storage.from(SITE_ASSETS_BUCKET).remove([previous.logo_path]);
  succeed("Ícono actualizado.", "logo");
}

export async function removeLogoAction(): Promise<void> {
  await requireAdminUser();
  const current = await getBusinessSettingsAdmin();
  await updateSettings({ logo_path: null });
  if (current.logo_path) await getServiceSupabase().storage.from(SITE_ASSETS_BUCKET).remove([current.logo_path]);
  succeed("Se quitó el ícono; se usa el de MW.", "logo");
}

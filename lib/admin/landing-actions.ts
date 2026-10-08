"use server";

/**
 * Server Actions de /admin/landing: textos por sección y foto de la
 * portada y de "Quiénes somos" (bucket `site-assets`). Las fotos de
 * ejemplo (`/sample/...`) viven en `public/` y nunca se borran.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_LANDING_SECTIONS } from "../landing-content";
import { LONG_CACHE_CONTROL, SITE_ASSETS_BUCKET } from "../storage";
import { getServiceSupabase } from "../supabase";
import { requireAdminUser } from "./auth";
import { isLandingImageKey, parseLandingTextForm } from "./landing-form";

const PATH = "/admin/landing";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function fail(message: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

function succeed(message: string, anchor: string): never {
  redirect(`${PATH}?saved=${encodeURIComponent(message)}#${anchor}`);
}

function revalidateLanding() {
  revalidatePath("/");
  revalidatePath(PATH);
}

async function getStoredImagePath(key: string): Promise<string | null> {
  const { data, error } = await getServiceSupabase().from("landing_sections").select("image_path").eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.image_path ?? null;
}

async function removeStoredImage(path: string | null) {
  if (!path || path.startsWith("/")) return;
  await getServiceSupabase().storage.from(SITE_ASSETS_BUCKET).remove([path]);
}

async function saveImagePath(key: string, path: string | null) {
  const { error } = await getServiceSupabase()
    .from("landing_sections")
    .upsert({ key, image_path: path, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function saveLandingTextAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const parsed = parseLandingTextForm(formData);
  if (!parsed.ok) fail(parsed.error);
  const { key, heading, subheading } = parsed.value;
  const { error } = await getServiceSupabase()
    .from("landing_sections")
    .upsert({ key, heading, subheading, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
  revalidateLanding();
  succeed(`${DEFAULT_LANDING_SECTIONS[key].label}: guardado.`, key);
}

export async function uploadLandingImageAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const key = String(formData.get("key") ?? "");
  if (!isLandingImageKey(key)) fail("Esa sección no lleva foto.");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) fail("Elige una foto.");
  const extension = IMAGE_TYPES[file.type];
  if (!extension) fail("La foto debe ser JPG, PNG o WebP.");
  if (file.size > MAX_IMAGE_BYTES) fail("La foto pesa demasiado (máximo 4 MB).");

  const path = `landing-${key}-${Date.now()}.${extension}`;
  const { error: uploadError } = await getServiceSupabase()
    .storage.from(SITE_ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: LONG_CACHE_CONTROL });
  if (uploadError) throw uploadError;

  const previous = await getStoredImagePath(key);
  await saveImagePath(key, path);
  await removeStoredImage(previous);
  revalidateLanding();
  succeed("Foto actualizada.", key);
}

export async function removeLandingImageAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const key = String(formData.get("key") ?? "");
  if (!isLandingImageKey(key)) fail("Esa sección no lleva foto.");
  const previous = await getStoredImagePath(key);
  await saveImagePath(key, null);
  await removeStoredImage(previous);
  revalidateLanding();
  succeed("Se regresó la foto original.", key);
}

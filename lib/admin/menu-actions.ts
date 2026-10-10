"use server";

/**
 * Server Actions de /admin/menu: productos, categorías y extras. Mismo
 * patrón que `actions.ts`: `requireAdminUser()` en cada una, escritura con
 * `service_role`, validación en `menu-form.ts` y aviso con `?saved=` /
 * `?error=` (lo muestra `Toast.tsx`).
 *
 * Cada cambio regenera `/menu` y `/` al momento (`revalidatePath`), así
 * que el cliente lo ve sin esperar el minuto del ISR.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceSupabase } from "../supabase";
import { isModelKind, isModelPathFor, MAX_MODEL_BYTES, modelColumn, modelPath, modelSizeCheck, type ModelKind } from "../models";
import { LONG_CACHE_CONTROL, MENU_MODELS_BUCKET, MENU_PHOTOS_BUCKET } from "../storage";
import { requireAdminUser } from "./auth";
import { getProductAdmin } from "./data";
import {
  moveInOrder,
  parseCategoryForm,
  parseExtraForm,
  parseExtraGroupForm,
  parseProductForm,
  slugify,
  uniqueSlug,
} from "./menu-form";

const MENU_PATH = "/admin/menu";
const CATEGORIES_PATH = "/admin/menu/categorias";
const EXTRAS_PATH = "/admin/menu/extras";

/** Agrega `?saved=` / `?error=` antes del `#ancla` (si va después, el navegador lo toma como parte del ancla). */
function withNotice(path: string, key: "saved" | "error", message: string): string {
  const [base, hash] = path.split("#");
  return `${base}?${key}=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`;
}

function fail(path: string, message: string): never {
  redirect(withNotice(path, "error", message));
}

function succeed(path: string, message: string): never {
  redirect(withNotice(path, "saved", message));
}

/** Regenera el panel y las páginas públicas que muestran el menú. */
function revalidateMenu() {
  revalidatePath("/admin", "layout");
  revalidatePath("/menu");
  revalidatePath("/");
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function direction(formData: FormData): "up" | "down" {
  return formData.get("direction") === "up" ? "up" : "down";
}

/** `?volver=` para regresar a la misma pantalla tras un cambio rápido. */
function returnPath(formData: FormData, fallback: string): string {
  const back = field(formData, "return_to");
  return back.startsWith("/admin/") ? back : fallback;
}

/** Las fotos de ejemplo viven en `public/` (empiezan con "/"): esas no se borran de Storage. */
async function removeStoredPhoto(path: string | null) {
  if (path && !path.startsWith("/")) {
    await getServiceSupabase().storage.from(MENU_PHOTOS_BUCKET).remove([path]);
  }
}

async function removeStoredModels(paths: (string | null)[]) {
  const stored = paths.filter((path): path is string => Boolean(path) && !path!.startsWith("/"));
  if (stored.length > 0) await getServiceSupabase().storage.from(MENU_MODELS_BUCKET).remove(stored);
}

// ---------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------

export async function saveProductAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const formPath = id ? `${MENU_PATH}/producto/${id}` : `${MENU_PATH}/producto/nuevo`;

  const parsed = parseProductForm(formData);
  if (!parsed.ok) fail(formPath, parsed.error);
  const input = parsed.value;
  const supabase = getServiceSupabase();

  const row = {
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    base_price_cents: input.basePriceCents,
    tags: input.tags,
    show_on_landing: input.showOnLanding,
    is_available: input.isAvailable,
    active: input.active,
    // Lo que Franco guarda ya no es dato de ejemplo (P2).
    is_sample: false,
    updated_at: new Date().toISOString(),
  };

  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const [{ data: slugs, error: slugError }, { data: last, error: lastError }] = await Promise.all([
      supabase.from("products").select("slug"),
      supabase
        .from("products")
        .select("sort_order")
        .eq("category_id", input.categoryId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (slugError) throw slugError;
    if (lastError) throw lastError;
    const slug = uniqueSlug(slugify(input.name), new Set(slugs.map((s) => s.slug)));
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, slug, sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    productId = data.id;
  }

  // Tamaños: se conservan los que siguen (mismo nombre) para no cambiar su id.
  const keepNames = input.sizes.map((s) => s.name);
  const { data: existingSizes, error: sizesError } = await supabase
    .from("product_sizes")
    .select("id, name")
    .eq("product_id", productId);
  if (sizesError) throw sizesError;
  const removed = existingSizes.filter((s) => !keepNames.includes(s.name)).map((s) => s.id);
  if (removed.length > 0) {
    const { error } = await supabase.from("product_sizes").delete().in("id", removed);
    if (error) throw error;
  }
  if (input.sizes.length > 0) {
    const { error } = await supabase.from("product_sizes").upsert(
      input.sizes.map((size, index) => ({
        product_id: productId,
        name: size.name,
        price_cents: size.priceCents,
        sort_order: index + 1,
      })),
      { onConflict: "product_id,name" }
    );
    if (error) throw error;
  }

  // Grupos de extras.
  const { error: unlinkError } = await supabase.from("product_extra_groups").delete().eq("product_id", productId);
  if (unlinkError) throw unlinkError;
  if (input.extraGroupIds.length > 0) {
    const { error } = await supabase
      .from("product_extra_groups")
      .insert(input.extraGroupIds.map((groupId, index) => ({ product_id: productId, group_id: groupId, sort_order: index + 1 })));
    if (error) throw error;
  }

  revalidateMenu();
  if (id) succeed(formPath, "Producto guardado.");
  succeed(`${MENU_PATH}/producto/${productId}`, "Producto creado. Ahora puedes subir su foto.");
}

export async function setProductFlagAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const flag = field(formData, "flag");
  const value = formData.get("value") === "true";
  const back = returnPath(formData, MENU_PATH);
  if (flag !== "is_available" && flag !== "active") fail(back, "Cambio no válido.");

  const { data, error } = await getServiceSupabase()
    .from("products")
    .update({
      ...(flag === "is_available" ? { is_available: value } : { active: value }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("name")
    .single();
  if (error) throw error;

  revalidateMenu();
  const message =
    flag === "is_available"
      ? value
        ? `"${data.name}" ya se puede pedir.`
        : `"${data.name}" marcado como agotado.`
      : value
        ? `"${data.name}" se muestra en el menú.`
        : `"${data.name}" quedó oculto.`;
  succeed(back, message);
}

export async function moveProductAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const supabase = getServiceSupabase();
  const product = await getProductAdmin(id);
  if (!product) fail(MENU_PATH, "Ese producto ya no existe.");

  const { data: siblings, error } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", product.category_id)
    .order("sort_order")
    .order("name");
  if (error) throw error;

  for (const { id: rowId, sortOrder } of moveInOrder(siblings.map((s) => s.id), id, direction(formData))) {
    const { error: updateError } = await supabase.from("products").update({ sort_order: sortOrder }).eq("id", rowId);
    if (updateError) throw updateError;
  }
  revalidateMenu();
  redirect(`${MENU_PATH}#producto-${id}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const product = await getProductAdmin(id);
  if (!product) fail(MENU_PATH, "Ese producto ya no existe.");

  const { error } = await getServiceSupabase().from("products").delete().eq("id", id);
  if (error) throw error;
  await removeStoredPhoto(product.photo_path);
  await removeStoredModels([product.model_glb_path, product.model_usdz_path]);

  revalidateMenu();
  succeed(MENU_PATH, `"${product.name}" se borró.`);
}

/** Tope del lado del servidor; el navegador ya la reduce a ~1600 px antes de subirla. */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadProductPhotoAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const formPath = `${MENU_PATH}/producto/${id}`;
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) fail(formPath, "Elige una foto.");
  const extension = PHOTO_TYPES[file.type];
  if (!extension) fail(formPath, "La foto debe ser JPG, PNG o WebP.");
  if (file.size > MAX_PHOTO_BYTES) fail(formPath, "La foto pesa demasiado (máximo 4 MB).");

  const product = await getProductAdmin(id);
  if (!product) fail(MENU_PATH, "Ese producto ya no existe.");

  const supabase = getServiceSupabase();
  const path = `${id}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MENU_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: LONG_CACHE_CONTROL });
  if (uploadError) throw uploadError;

  const { error } = await supabase
    .from("products")
    .update({ photo_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await removeStoredPhoto(product.photo_path);

  revalidateMenu();
  succeed(formPath, "Foto actualizada.");
}

export async function removeProductPhotoAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const formPath = `${MENU_PATH}/producto/${id}`;
  const product = await getProductAdmin(id);
  if (!product) fail(MENU_PATH, "Ese producto ya no existe.");

  const { error } = await getServiceSupabase()
    .from("products")
    .update({ photo_path: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await removeStoredPhoto(product.photo_path);

  revalidateMenu();
  succeed(formPath, "Foto quitada.");
}

// ---------------------------------------------------------------------
// Modelos 3D (`docs/3d-ar.md`): el navegador los sube directo a Storage
// con un permiso firmado (no pasan por Vercel, que corta en 4.5 MB).
// ---------------------------------------------------------------------

export type ModelActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Paso 1: permiso de un solo uso para subir el archivo a una ruta nueva. */
export async function prepareModelUploadAction(productId: string, kind: ModelKind, bytes: number): Promise<ModelActionResult<{ path: string; token: string }>> {
  await requireAdminUser();
  if (!isModelKind(kind)) return { ok: false, error: "Tipo de archivo desconocido." };
  const size = modelSizeCheck(bytes);
  if (size.error) return { ok: false, error: size.error };
  const product = await getProductAdmin(productId);
  if (!product) return { ok: false, error: "Ese producto ya no existe." };
  if (kind === "usdz" && !product.model_glb_path) return { ok: false, error: "Primero sube el modelo .glb." };

  const path = modelPath(productId, kind, Date.now());
  const { data, error } = await getServiceSupabase().storage.from(MENU_MODELS_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return { ok: true, path: data.path, token: data.token };
}

/** Paso 2: el archivo ya está en Storage; se revisa y se liga al producto. */
export async function saveProductModelAction(productId: string, kind: ModelKind, path: string): Promise<ModelActionResult> {
  await requireAdminUser();
  if (!isModelKind(kind) || !isModelPathFor(productId, kind, path)) return { ok: false, error: "No reconocemos ese archivo." };
  const product = await getProductAdmin(productId);
  if (!product) return { ok: false, error: "Ese producto ya no existe." };

  const supabase = getServiceSupabase();
  const bucket = supabase.storage.from(MENU_MODELS_BUCKET);
  const { data: info, error: infoError } = await bucket.info(path);
  if (infoError || !info) return { ok: false, error: "No encontramos el archivo subido. Intenta otra vez." };
  if ((info.size ?? 0) > MAX_MODEL_BYTES) {
    await bucket.remove([path]);
    return { ok: false, error: "El archivo pesa demasiado." };
  }

  const column = modelColumn(kind);
  const { error } = await supabase
    .from("products")
    .update(kind === "glb" ? { model_glb_path: path, updated_at: new Date().toISOString() } : { model_usdz_path: path, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw error;
  await removeStoredModels([product[column]]);
  revalidateMenu();
  revalidatePath(`${MENU_PATH}/producto/${productId}`);
  return { ok: true };
}

export async function removeProductModelAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const kind = field(formData, "kind");
  const formPath = `${MENU_PATH}/producto/${id}`;
  if (!isModelKind(kind)) fail(formPath, "Tipo de archivo desconocido.");
  const product = await getProductAdmin(id);
  if (!product) fail(MENU_PATH, "Ese producto ya no existe.");

  // Sin .glb no hay 3D: se quita también la versión para iPhone.
  const update = kind === "glb" ? { model_glb_path: null, model_usdz_path: null } : { model_usdz_path: null };
  const { error } = await getServiceSupabase()
    .from("products")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await removeStoredModels(kind === "glb" ? [product.model_glb_path, product.model_usdz_path] : [product.model_usdz_path]);

  revalidateMenu();
  succeed(formPath, kind === "glb" ? "Modelo 3D quitado." : "Versión para iPhone quitada.");
}

// ---------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------

export async function saveCategoryAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const parsed = parseCategoryForm(formData);
  if (!parsed.ok) fail(CATEGORIES_PATH, parsed.error);
  const { name, description, active } = parsed.value;
  const supabase = getServiceSupabase();

  if (id) {
    const { error } = await supabase.from("categories").update({ name, description, active }).eq("id", id);
    if (error) throw error;
  } else {
    const [{ data: slugs, error: slugError }, { data: last, error: lastError }] = await Promise.all([
      supabase.from("categories").select("slug"),
      supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (slugError) throw slugError;
    if (lastError) throw lastError;
    const slug = uniqueSlug(slugify(name) || "categoria", new Set(slugs.map((s) => s.slug)));
    const { error } = await supabase
      .from("categories")
      .insert({ name, description, active, slug, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) throw error;
  }

  revalidateMenu();
  succeed(CATEGORIES_PATH, id ? "Categoría guardada." : `Categoría "${name}" creada.`);
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("categories").select("id").order("sort_order").order("name");
  if (error) throw error;
  for (const { id, sortOrder } of moveInOrder(data.map((c) => c.id), field(formData, "id"), direction(formData))) {
    const { error: updateError } = await supabase.from("categories").update({ sort_order: sortOrder }).eq("id", id);
    if (updateError) throw updateError;
  }
  revalidateMenu();
  redirect(CATEGORIES_PATH);
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const supabase = getServiceSupabase();
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) throw countError;
  if (count && count > 0) {
    fail(
      CATEGORIES_PATH,
      `Esta categoría tiene ${count} ${count === 1 ? "producto" : "productos"}. Muévelos a otra categoría o bórralos primero (o mejor ocúltala).`
    );
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidateMenu();
  succeed(CATEGORIES_PATH, "Categoría borrada.");
}

// ---------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------

export async function saveExtraGroupAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const parsed = parseExtraGroupForm(formData);
  if (!parsed.ok) fail(EXTRAS_PATH, parsed.error);
  const row = { name: parsed.value.name, min_select: parsed.value.minSelect, max_select: parsed.value.maxSelect };
  const supabase = getServiceSupabase();

  if (id) {
    const { error } = await supabase.from("extra_groups").update(row).eq("id", id);
    if (error) fail(EXTRAS_PATH, error.code === "23505" ? `Ya existe un grupo llamado "${row.name}".` : "No se pudo guardar.");
  } else {
    const { data: last, error: lastError } = await supabase
      .from("extra_groups")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const { error } = await supabase.from("extra_groups").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) fail(EXTRAS_PATH, error.code === "23505" ? `Ya existe un grupo llamado "${row.name}".` : "No se pudo guardar.");
  }

  revalidateMenu();
  succeed(EXTRAS_PATH, id ? "Grupo guardado." : `Grupo "${row.name}" creado. Agrégale extras y asígnalo a sus productos.`);
}

export async function deleteExtraGroupAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const { error } = await getServiceSupabase().from("extra_groups").delete().eq("id", field(formData, "id"));
  if (error) throw error;
  revalidateMenu();
  succeed(EXTRAS_PATH, "Grupo borrado, con sus extras.");
}

export async function saveExtraAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const id = field(formData, "id");
  const groupId = field(formData, "group_id");
  const parsed = parseExtraForm(formData);
  if (!parsed.ok) fail(EXTRAS_PATH, parsed.error);
  const row = { name: parsed.value.name, price_cents: parsed.value.priceCents, is_available: parsed.value.isAvailable };
  const supabase = getServiceSupabase();

  if (id) {
    const { error } = await supabase.from("extras").update(row).eq("id", id);
    if (error) fail(EXTRAS_PATH, error.code === "23505" ? `"${row.name}" ya está en este grupo.` : "No se pudo guardar.");
  } else {
    const { data: last, error: lastError } = await supabase
      .from("extras")
      .select("sort_order")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const { error } = await supabase
      .from("extras")
      .insert({ ...row, group_id: groupId, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) fail(EXTRAS_PATH, error.code === "23505" ? `"${row.name}" ya está en este grupo.` : "No se pudo guardar.");
  }

  revalidateMenu();
  succeed(EXTRAS_PATH, id ? "Extra guardado." : `"${row.name}" agregado.`);
}

export async function moveExtraAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("extras")
    .select("id")
    .eq("group_id", field(formData, "group_id"))
    .order("sort_order")
    .order("name");
  if (error) throw error;
  for (const { id, sortOrder } of moveInOrder(data.map((e) => e.id), field(formData, "id"), direction(formData))) {
    const { error: updateError } = await supabase.from("extras").update({ sort_order: sortOrder }).eq("id", id);
    if (updateError) throw updateError;
  }
  revalidateMenu();
  redirect(`${EXTRAS_PATH}#grupo-${field(formData, "group_id")}`);
}

export async function deleteExtraAction(formData: FormData): Promise<void> {
  await requireAdminUser();
  const { error } = await getServiceSupabase().from("extras").delete().eq("id", field(formData, "id"));
  if (error) throw error;
  revalidateMenu();
  succeed(EXTRAS_PATH, "Extra borrado.");
}

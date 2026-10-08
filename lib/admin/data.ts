/**
 * Lecturas de `/admin` con `service_role` (ve también lo oculto y lo
 * agotado). Cada página llama antes a `requireAdminUser()`.
 */

import { getServiceSupabase } from "../supabase";
import type { Tables } from "../database.types";

export type BusinessSettingsRow = Tables<"business_settings">;

export async function getBusinessSettingsAdmin(): Promise<BusinessSettingsRow> {
  const { data, error } = await getServiceSupabase().from("business_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export interface MenuSummary {
  categories: number;
  products: number;
  hidden: number;
  soldOut: number;
  samples: number;
  withoutPhoto: number;
  with3d: number;
}

/** Números del inicio del panel. */
export async function getMenuSummaryAdmin(): Promise<MenuSummary> {
  const supabase = getServiceSupabase();
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("active, is_available, is_sample, photo_path, model_glb_path"),
  ]);
  if (categories.error) throw categories.error;
  if (products.error) throw products.error;

  const rows = products.data;
  return {
    categories: categories.count ?? 0,
    products: rows.length,
    hidden: rows.filter((p) => !p.active).length,
    soldOut: rows.filter((p) => p.active && !p.is_available).length,
    samples: rows.filter((p) => p.is_sample).length,
    withoutPhoto: rows.filter((p) => !p.photo_path).length,
    with3d: rows.filter((p) => p.model_glb_path).length,
  };
}

// ---------------------------------------------------------------------
// Menú (/admin/menu): todo, incluidos ocultos y agotados.
// ---------------------------------------------------------------------

export type CategoryRow = Tables<"categories">;
export type ProductSizeRow = Tables<"product_sizes">;
export type ExtraGroupRow = Tables<"extra_groups">;
export type ExtraRow = Tables<"extras">;
export type ProductAdminRow = Tables<"products"> & {
  product_sizes: ProductSizeRow[];
  extraGroupIds: string[];
};
export type ExtraGroupAdmin = ExtraGroupRow & { extras: ExtraRow[]; productCount: number };
export type CategoryAdmin = CategoryRow & { products: ProductAdminRow[] };

function toProductAdmin(
  row: Tables<"products"> & { product_sizes: ProductSizeRow[]; product_extra_groups: { group_id: string; sort_order: number }[] }
): ProductAdminRow {
  const { product_extra_groups, ...product } = row;
  return {
    ...product,
    product_sizes: [...row.product_sizes].sort((a, b) => a.sort_order - b.sort_order),
    extraGroupIds: [...product_extra_groups].sort((a, b) => a.sort_order - b.sort_order).map((link) => link.group_id),
  };
}

const PRODUCT_ADMIN_SELECT = "*, product_sizes(*), product_extra_groups(group_id, sort_order)";

export async function getMenuAdmin(): Promise<CategoryAdmin[]> {
  const supabase = getServiceSupabase();
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select(PRODUCT_ADMIN_SELECT).order("sort_order").order("name"),
  ]);
  if (categories.error) throw categories.error;
  if (products.error) throw products.error;
  const all = products.data.map(toProductAdmin);
  return categories.data.map((category) => ({
    ...category,
    products: all.filter((product) => product.category_id === category.id),
  }));
}

export async function getCategoriesAdmin(): Promise<CategoryRow[]> {
  const { data, error } = await getServiceSupabase().from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return data;
}

export async function getProductAdmin(id: string): Promise<ProductAdminRow | null> {
  const { data, error } = await getServiceSupabase().from("products").select(PRODUCT_ADMIN_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toProductAdmin(data) : null;
}

export async function getExtraGroupsAdmin(): Promise<ExtraGroupAdmin[]> {
  const { data, error } = await getServiceSupabase()
    .from("extra_groups")
    .select("*, extras(*), product_extra_groups(product_id)")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data.map(({ extras, product_extra_groups, ...group }) => ({
    ...group,
    extras: [...extras].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    productCount: product_extra_groups.length,
  }));
}

export type LandingSectionRow = Tables<"landing_sections">;

export interface LandingAdmin {
  /** Lo guardado tal cual (sin los textos por defecto) para saber qué cambió Franco. */
  rows: Map<string, LandingSectionRow>;
  /** Productos visibles marcados "en portada". */
  featuredNames: string[];
}

export async function getLandingAdmin(): Promise<LandingAdmin> {
  const supabase = getServiceSupabase();
  const [sections, featured] = await Promise.all([
    supabase.from("landing_sections").select("*"),
    supabase.from("products").select("name, sort_order, categories!inner(sort_order, active)").eq("show_on_landing", true).eq("active", true).eq("categories.active", true),
  ]);
  if (sections.error) throw sections.error;
  if (featured.error) throw featured.error;
  const featuredNames = featured.data
    .sort((a, b) => a.categories.sort_order - b.categories.sort_order || a.sort_order - b.sort_order)
    .map((product) => product.name);
  return { rows: new Map(sections.data.map((row) => [row.key, row])), featuredNames };
}

export interface MetricsAdmin {
  rows: { day: string; metric: string; key: string; count: number }[];
  /** id → nombre de todos los productos (también ocultos), para la lista de más vistos. */
  productNames: Map<string, string>;
}

/** Conteos desde `sinceDay` ("YYYY-MM-DD", hora de México) para /admin/metricas. */
export async function getMetricsAdmin(sinceDay: string): Promise<MetricsAdmin> {
  const supabase = getServiceSupabase();
  // Supabase entrega máximo 1000 filas por consulta; 90 días pueden ser más.
  const PAGE = 1000;
  const rows: MetricsAdmin["rows"] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("metric_counts")
      .select("day, metric, key, count")
      .gte("day", sinceDay)
      .order("day")
      .order("metric")
      .order("key")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  const { data: products, error } = await supabase.from("products").select("id, name");
  if (error) throw error;
  return { rows, productNames: new Map(products.map((p) => [p.id, p.name])) };
}

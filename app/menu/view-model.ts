import { productPriceLabel } from "@/lib/money";
import type { PublicMenuCategory } from "@/lib/public-data";
import { getMenuModelUrl, getMenuPhotoUrl } from "@/lib/storage";
import type { MenuCategoryView } from "./types";

/** Lo que el navegador necesita del menú (lo usan /menu y /carrito): sin columnas internas. */
export function toMenuCategoryViews(menu: PublicMenuCategory[]): MenuCategoryView[] {
  return menu
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      products: category.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        tags: product.tags,
        photoUrl: getMenuPhotoUrl(product.photo_path),
        modelUrl: getMenuModelUrl(product.model_glb_path),
        modelIosUrl: product.model_glb_path ? getMenuModelUrl(product.model_usdz_path) : null,
        priceLabel: productPriceLabel(product),
        base_price_cents: product.base_price_cents,
        is_available: product.is_available,
        product_sizes: product.product_sizes.map(({ id, name, price_cents }) => ({ id, name, price_cents })),
        extra_groups: product.extra_groups.map((group) => ({
          id: group.id,
          name: group.name,
          min_select: group.min_select,
          max_select: group.max_select,
          extras: group.extras.map(({ id, name, price_cents, is_available }) => ({ id, name, price_cents, is_available })),
        })),
      })),
    }));
}

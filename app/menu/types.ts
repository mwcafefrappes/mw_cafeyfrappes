import type { PricedExtraGroup, PricedProduct } from "@/lib/item-price";

/** Lo que el servidor le pasa al menú del navegador: solo lo que se pinta. */
export interface MenuProductView extends PricedProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  /** URL ya resuelta (Storage o `public/`); `null` = sin foto. */
  photoUrl: string | null;
  /** Modelo 3D (`.glb`) y versión para iPhone (`.usdz`, opcional); `null` = sin 3D. */
  modelUrl: string | null;
  modelIosUrl: string | null;
  priceLabel: string;
  product_sizes: { id: string; name: string; price_cents: number }[];
  extra_groups: PricedExtraGroup[];
}

export interface MenuCategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products: MenuProductView[];
}

import { ClockIcon, CupIcon, HomeIcon, StoreIcon } from "./Icons";

/**
 * Secciones del panel, en el orden del nav. Se agregan conforme avanza el
 * roadmap: Landing, QR y Métricas (Fase 4), Pedidos
 * (Fase 5), Instagram (Fase 7).
 */
export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Inicio", Icon: HomeIcon },
  { href: "/admin/menu", label: "Menú", Icon: CupIcon },
  { href: "/admin/negocio", label: "Negocio", Icon: StoreIcon },
  { href: "/admin/horario", label: "Horario", Icon: ClockIcon },
];

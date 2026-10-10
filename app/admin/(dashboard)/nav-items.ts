import { ChartBarIcon, ClockIcon, CupIcon, HomeIcon, LayoutIcon, QrIcon, ReceiptIcon, StoreIcon } from "./Icons";

/**
 * Secciones del panel, en el orden del nav. Se agregan conforme avanza el
 * roadmap: Instagram (Fase 7).
 */
export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Inicio", Icon: HomeIcon },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ReceiptIcon },
  { href: "/admin/menu", label: "Menú", Icon: CupIcon },
  { href: "/admin/negocio", label: "Negocio", Icon: StoreIcon },
  { href: "/admin/horario", label: "Horario", Icon: ClockIcon },
  { href: "/admin/landing", label: "Portada", Icon: LayoutIcon },
  { href: "/admin/qr", label: "QR", Icon: QrIcon },
  { href: "/admin/metricas", label: "Métricas", Icon: ChartBarIcon },
];

import { requireAdminUser } from "@/lib/admin/auth";
import { MAX_DAYS_AHEAD, SLOT_MINUTE_OPTIONS } from "@/lib/admin/business-form";
import { getBusinessSettingsAdmin } from "@/lib/admin/data";
import { env } from "@/lib/config/business";
import {
  ALLOWED_METHODS,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  parsePaymentMatrix,
  type OrderType,
} from "@/lib/payment-methods";
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { getSiteAssetUrl } from "@/lib/storage";
import { SettingsSection as Section } from "../SettingsSection";
import { Toggle } from "../Toggle";
import { cardClass, hintClass, inputClass, labelClass } from "../ui";
import { LogoUploader } from "./LogoUploader";

export const dynamic = "force-dynamic";

function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** "52958…" → "958 186 1260" para mostrarlo como lo escribe Franco. */
function whatsappToInput(value: string | null): string {
  if (!value) return "";
  const local = value.replace(/^52/, "");
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : value;
}

const ORDER_TYPE_SHORT_LABELS = { pickup: "Recoger", table: "Mesa", delivery: "Domicilio" } as const;

/** Encabezados cortos para que la tabla quepa en el celular. */
const METHOD_SHORT_LABELS = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta en línea" } as const;

const LEAD_OPTIONS = [0, 30, 60, 90, 120, 180, 240, 360, 720, 1440];

function leadLabel(minutes: number): string {
  if (minutes === 0) return "Sin anticipación";
  if (minutes < 60) return `${minutes} minutos`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

export default async function AdminBusinessPage() {
  await requireAdminUser();
  const settings = await getBusinessSettingsAdmin();
  const stripeReady = env.stripeReady;
  const matrix = parsePaymentMatrix(settings.payment_methods);
  const transferOffered = matrix.pickup.includes("transfer") || matrix.table.includes("transfer");
  const leadOptions = LEAD_OPTIONS.includes(settings.scheduled_min_lead_minutes)
    ? LEAD_OPTIONS
    : [...LEAD_OPTIONS, settings.scheduled_min_lead_minutes].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Negocio</h1>
        <p className="mt-1 text-sm text-brand-ink/70">Cada sección se guarda por separado. Los cambios se ven en el sitio al momento.</p>
      </div>

      <Section id="pedidos" title="Tipos de pedido y envío">
        <div className="flex flex-col gap-3">
          <Toggle name="order_pickup_enabled" label={ORDER_TYPE_LABELS.pickup} defaultChecked={settings.order_pickup_enabled} />
          <Toggle name="order_table_enabled" label={`${ORDER_TYPE_LABELS.table} (con el QR de cada mesa)`} defaultChecked={settings.order_table_enabled} />
          {stripeReady ? (
            <Toggle name="order_delivery_enabled" label={ORDER_TYPE_LABELS.delivery} defaultChecked={settings.order_delivery_enabled} />
          ) : (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2.5 text-sm text-brand-ink/50">
                <span className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-brand-border" aria-hidden />
                {ORDER_TYPE_LABELS.delivery}
              </span>
              <span className={hintClass}>Se paga con tarjeta en línea; se activa en cuanto el cobro con tarjeta esté listo.</span>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField name="delivery_min_subtotal" label="Pedido mínimo a domicilio" cents={settings.delivery_min_subtotal_cents} />
          <MoneyField name="delivery_fee" label="Costo de envío" cents={settings.delivery_fee_cents} />
          <label className={labelClass}>
            Cobro del envío
            <select name="delivery_fee_mode" defaultValue={settings.delivery_fee_mode} className={inputClass}>
              <option value="auto">Automático: siempre el costo de envío</option>
              <option value="manual">Manual: lo fijo en cada pedido</option>
            </select>
          </label>
        </div>
        <p className={hintClass}>
          En manual, el pedido llega sin envío y tú lo pones al recibirlo; el cliente ve el total actualizado.
        </p>
      </Section>

      <Section id="pagos" title="Métodos de pago">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-brand-ink/60">
                <th className="py-2 pr-3 font-medium">Pedido</th>
                {(["cash", "transfer", "card"] as const).map((method) => (
                  <th key={method} className="px-1.5 py-2 text-center font-medium">
                    {METHOD_SHORT_LABELS[method]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {(["pickup", "table", "delivery"] as const satisfies OrderType[]).map((type) => (
                <tr key={type}>
                  <td className="py-2.5 pr-2 font-medium">{ORDER_TYPE_SHORT_LABELS[type]}</td>
                  {(["cash", "transfer", "card"] as const).map((method) => {
                    const allowed = ALLOWED_METHODS[type].includes(method);
                    const fixed = type === "delivery";
                    const disabled = !allowed || fixed || (method === "card" && !stripeReady);
                    return (
                      <td key={method} className="px-2 py-2.5 text-center">
                        {allowed ? (
                          <input
                            type="checkbox"
                            name={fixed ? undefined : `pay_${type}`}
                            value={method}
                            defaultChecked={matrix[type].includes(method)}
                            disabled={disabled}
                            aria-label={`${PAYMENT_METHOD_LABELS[method]} en ${ORDER_TYPE_LABELS[type]}`}
                            className="h-4 w-4 accent-[var(--brand-accent)] disabled:opacity-50"
                          />
                        ) : (
                          <span className="text-brand-ink/30" aria-label="No disponible">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={hintClass}>
          Tarjeta en línea incluye Google Pay y Apple Pay. A domicilio siempre se paga así.
          {stripeReady ? "" : " El pago con tarjeta todavía no está disponible."} Efectivo y transferencia los marcas como
          pagados tú en Pedidos.
        </p>

        <div className="border-t border-brand-border pt-4">
          <p className="text-sm font-semibold">Datos para transferencia</p>
          <p className={hintClass}>Se le muestran al cliente que elige transferencia.</p>
          {transferOffered && !settings.transfer_clabe && (
            <p className="mt-2 rounded-[10px] bg-brand-accent-wash px-3 py-2 text-xs">
              Ofreces transferencia pero falta la CLABE: el cliente no sabría a dónde pagar.
            </p>
          )}
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              CLABE
              <input name="transfer_clabe" inputMode="numeric" defaultValue={settings.transfer_clabe ?? ""} placeholder="18 dígitos" className={inputClass} />
            </label>
            <label className={labelClass}>
              Banco
              <input name="transfer_bank" defaultValue={settings.transfer_bank ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              Titular
              <input name="transfer_holder" defaultValue={settings.transfer_holder ?? ""} className={inputClass} />
            </label>
          </div>
        </div>
      </Section>

      <Section id="programados" title="Pedidos programados">
        <Toggle
          name="scheduled_orders_enabled"
          label="El cliente puede elegir la hora a la que recoge o recibe"
          defaultChecked={settings.scheduled_orders_enabled}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Anticipación mínima
            <select name="scheduled_min_lead_minutes" defaultValue={settings.scheduled_min_lead_minutes} className={inputClass}>
              {leadOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {leadLabel(minutes)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Se elige hora cada
            <select name="scheduled_slot_minutes" defaultValue={settings.scheduled_slot_minutes} className={inputClass}>
              {SLOT_MINUTE_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes === 60 ? "1 hora" : `${minutes} minutos`}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Máximo de pedidos por horario
            <input name="scheduled_max_per_slot" type="number" min={1} max={99} defaultValue={settings.scheduled_max_per_slot} className={inputClass} />
          </label>
          <label className={labelClass}>
            Hasta cuántos días adelante
            <input
              name="scheduled_max_days_ahead"
              type="number"
              min={0}
              max={MAX_DAYS_AHEAD}
              defaultValue={settings.scheduled_max_days_ahead}
              className={inputClass}
            />
            <span className={hintClass}>0 = solo para hoy. Siempre dentro del horario de apertura.</span>
          </label>
        </div>
      </Section>

      <Section id="contacto" title="Contacto y redes">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            WhatsApp del negocio
            <input
              name="business_whatsapp"
              inputMode="tel"
              defaultValue={whatsappToInput(settings.business_whatsapp)}
              placeholder="958 186 1260"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Correo
            <input name="business_email" type="email" defaultValue={settings.business_email ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Instagram
            <input name="social_instagram_url" defaultValue={settings.social_instagram_url ?? ""} placeholder="https://www.instagram.com/…" className={inputClass} />
          </label>
          <label className={labelClass}>
            Facebook
            <input name="social_facebook_url" defaultValue={settings.social_facebook_url ?? ""} placeholder="https://www.facebook.com/…" className={inputClass} />
          </label>
          <label className={labelClass}>
            Tienda principal
            <input name="parent_store_name" required defaultValue={settings.parent_store_name} className={inputClass} />
            <span className={hintClass}>Aparece como &quot;Extensión de …&quot; en la portada.</span>
          </label>
          <label className={labelClass}>
            Instagram de la tienda principal
            <input name="parent_store_instagram_url" defaultValue={settings.parent_store_instagram_url ?? ""} className={inputClass} />
          </label>
        </div>
      </Section>

      <Section id="ubicacion" title="Ubicación">
        <label className={labelClass}>
          Dirección
          <input name="business_address" defaultValue={settings.business_address ?? ""} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Latitud
            <input name="business_lat" inputMode="decimal" defaultValue={settings.business_lat ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Longitud
            <input name="business_lng" inputMode="decimal" defaultValue={settings.business_lng ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Enlace de Google Maps
            <input name="maps_url" defaultValue={settings.maps_url ?? ""} className={inputClass} />
          </label>
        </div>
        <p className={hintClass}>
          Latitud y longitud: en Google Maps, mantén presionado el punto del local y copia los dos números que aparecen.
          Mueven el mapa y los botones de &quot;Cómo llegar&quot;.
        </p>
      </Section>

      <Section id="sitio" title="Sitio y Google">
        <label className={labelClass}>
          Dirección del sitio
          <input name="site_url" defaultValue={settings.site_url ?? ""} placeholder="https://…" className={inputClass} />
          <span className={hintClass}>La que va en los QR y en los links que se comparten.</span>
        </label>
        <label className={labelClass}>
          Título en Google
          <input name="seo_title" maxLength={SEO_TITLE_MAX} defaultValue={settings.seo_title ?? ""} placeholder={DEFAULT_SEO_TITLE} className={inputClass} />
        </label>
        <label className={labelClass}>
          Descripción en Google
          <textarea
            name="seo_description"
            rows={2}
            maxLength={SEO_DESCRIPTION_MAX}
            defaultValue={settings.seo_description ?? ""}
            placeholder={DEFAULT_SEO_DESCRIPTION}
            className={inputClass}
          />
          <span className={hintClass}>Vacío = se usa el texto gris de ejemplo.</span>
        </label>
      </Section>

      <section id="logo" className={`${cardClass} flex scroll-mt-24 flex-col gap-4`}>
        <h2 className="font-display text-xl font-semibold">Ícono del sitio</h2>
        <LogoUploader logoUrl={getSiteAssetUrl(settings.logo_path)} />
      </section>
    </div>
  );
}

function MoneyField({ name, label, cents }: { name: string; label: string; cents: number }) {
  return (
    <label className={labelClass}>
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/60">$</span>
        <input name={name} inputMode="decimal" defaultValue={centsToInput(cents)} className={`${inputClass} pl-7`} />
      </span>
    </label>
  );
}

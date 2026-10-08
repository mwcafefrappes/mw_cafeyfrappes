import Link from "next/link";
import { requireAdminUser } from "@/lib/admin/auth";
import { getBusinessSettingsAdmin } from "@/lib/admin/data";
import { MAX_TABLE_NUMBER } from "@/lib/menu";
import { instagramHandle } from "@/lib/qr";
import { resolveSiteBaseUrl } from "@/lib/seo";
import { parseTimeFormat } from "@/lib/time-format";
import { parseWeeklyHours, summarizeWeeklyHours } from "@/lib/weekly-hours";
import { SettingsSection } from "../SettingsSection";
import { hintClass, inputClass, labelClass } from "../ui";
import { QrStudioLoader } from "./QrStudioLoader";

export const dynamic = "force-dynamic";

/** Por si la base aún no tiene la columna (migración pendiente en producción). */
const DEFAULT_TABLE_COUNT = 6;

export default async function AdminQrPage() {
  await requireAdminUser();
  const settings = await getBusinessSettingsAdmin();
  const tableCount = settings.table_count ?? DEFAULT_TABLE_COUNT;
  const siteUrl = resolveSiteBaseUrl(settings);
  const menuUrl = `${siteUrl}/menu`;
  const isLocal = /localhost|127\.0\.0\.1/.test(siteUrl);
  const hours = summarizeWeeklyHours(parseWeeklyHours(settings.weekly_hours), parseTimeFormat(settings.time_format))
    .map((line) => `${line.days} · ${line.hours}`)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">QR</h1>
        <p className="mt-1 text-sm text-brand-ink/70">
          Tarjetas con QR para cada mesa, el mostrador y la publicidad. Se generan aquí mismo, listas para imprimir.
        </p>
      </div>

      <SettingsSection id="mesas" title="Mesas">
        <label className={`${labelClass} max-w-[12rem]`}>
          ¿Cuántas mesas hay?
          <input name="table_count" type="number" inputMode="numeric" min={1} max={MAX_TABLE_NUMBER} defaultValue={tableCount} className={inputClass} />
        </label>
        <p className={hintClass}>Cada mesa tiene su QR; al escanearlo, el pedido llega con el número de mesa.</p>
      </SettingsSection>

      <div className={`rounded-[14px] border p-4 text-sm ${isLocal ? "border-amber-600/40 bg-amber-500/10" : "border-brand-border"}`}>
        {isLocal ? (
          <>
            <strong>Ojo:</strong> la dirección del sitio es <span className="break-all">{siteUrl}</span>, que solo funciona en esta computadora. Pon
            la dirección pública en{" "}
            <Link href="/admin/negocio#sitio" className="font-medium underline underline-offset-4">
              Negocio → Sitio y Google
            </Link>{" "}
            antes de imprimir.
          </>
        ) : (
          <>
            Los QR llevan a <span className="break-all font-medium">{menuUrl}</span>. Si algún día cambia la dirección del sitio (por ejemplo, con un
            dominio propio), hay que volver a imprimirlos. Se cambia en{" "}
            <Link href="/admin/negocio#sitio" className="font-medium underline underline-offset-4">
              Negocio → Sitio y Google
            </Link>
            .
          </>
        )}
      </div>

      <QrStudioLoader
        menuUrl={menuUrl}
        tableCount={tableCount}
        defaultTexts={{
          generalTitle: "Menú digital",
          tableInvite: "Escanea y pide desde tu mesa",
          generalInvite: "Escanea y mira el menú",
          detail: hours,
          signature: instagramHandle(settings.social_instagram_url) ?? "",
        }}
      />
    </div>
  );
}

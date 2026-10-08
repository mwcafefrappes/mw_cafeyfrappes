import Link from "next/link";
import { getMenuSummaryAdmin, getBusinessSettingsAdmin } from "@/lib/admin/data";
import { requireAdminUser } from "@/lib/admin/auth";
import { parseTimeFormat } from "@/lib/time-format";
import { isOpenAt, parseWeeklyHours, summarizeWeeklyHours } from "@/lib/weekly-hours";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdminUser();
  const [summary, settings] = await Promise.all([getMenuSummaryAdmin(), getBusinessSettingsAdmin()]);
  const hours = parseWeeklyHours(settings.weekly_hours);
  const open = isOpenAt(hours, new Date());
  const hoursLines = summarizeWeeklyHours(hours, parseTimeFormat(settings.time_format));

  const stats = [
    { label: "Productos en el menú", value: summary.products - summary.hidden },
    { label: "Categorías", value: summary.categories },
    { label: "Agotados", value: summary.soldOut },
    { label: "Ocultos", value: summary.hidden },
    { label: "Sin foto", value: summary.withoutPhoto },
    { label: "Con vista 3D", value: summary.with3d },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Inicio</h1>
          <p className="mt-1 text-sm text-brand-ink/70">
            {hoursLines.map((line) => `${line.days} · ${line.hours}`).join(" · ") || "Sin horario configurado"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            open ? "border-green-600/40 bg-green-600/10" : "border-brand-border bg-brand-sand"
          }`}
        >
          <span aria-hidden className={`h-2 w-2 rounded-full ${open ? "bg-green-600" : "bg-brand-stone"}`} />
          {open ? "Abierto ahora" : "Cerrado ahora"}
        </span>
      </div>

      {summary.samples > 0 && (
        <p className="rounded-[10px] border border-brand-accent/40 bg-brand-accent-wash p-4 text-sm">
          <strong className="font-semibold">Menú de ejemplo.</strong> {summary.samples} productos tienen nombres, precios y
          fotos provisionales. Al editarlos y guardarlos en{" "}
          <Link href="/admin/menu" className="underline underline-offset-4">
            Menú
          </Link>{" "}
          dejan de ser de ejemplo.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[10px] border border-brand-border bg-brand-sand/60 p-4">
            <dt className="text-xs text-brand-ink/70">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-[10px] border border-brand-border p-4 text-sm">
        <h2 className="font-semibold">Lo que viene en el panel</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-ink/80">
          <li>Métricas de visitas.</li>
          <li>Pedidos en vivo.</li>
        </ul>
        <p className="mt-3">
          <Link href="/" className="underline underline-offset-4">
            Ver el sitio
          </Link>
        </p>
      </section>
    </div>
  );
}

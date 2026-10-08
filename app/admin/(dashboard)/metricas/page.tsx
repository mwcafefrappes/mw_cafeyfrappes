import Link from "next/link";
import { requireAdminUser } from "@/lib/admin/auth";
import { getMetricsAdmin } from "@/lib/admin/data";
import { lastDays, LINK_LABELS, METRIC_RANGES, mexicoToday, parseMetricRange, summarizeMetrics } from "@/lib/metrics";
import { cardClass } from "../ui";

export const dynamic = "force-dynamic";

const TOP_PRODUCTS = 10;
const SHORT_DATE = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

function shortDate(day: string): string {
  return SHORT_DATE.format(new Date(`${day}T00:00:00Z`));
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-brand-border bg-brand-sand/60 p-4">
      <p className="text-xs text-brand-ink/70">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-MX")}</p>
      {hint && <p className="mt-1 text-xs text-brand-ink/60">{hint}</p>}
    </div>
  );
}

/** Barra horizontal proporcional al máximo de la lista. */
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
      <span className="truncate">{label}</span>
      <span className="tabular-nums text-brand-ink/80">{value.toLocaleString("es-MX")}</span>
      <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-brand-border/60">
        <span className="block h-full rounded-full bg-brand-primary" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </span>
    </li>
  );
}

export default async function AdminMetricsPage({ searchParams }: PageProps<"/admin/metricas">) {
  await requireAdminUser();
  const range = parseMetricRange((await searchParams).dias);
  const days = lastDays(mexicoToday(new Date()), range);
  const { rows, productNames } = await getMetricsAdmin(days[0]);
  const summary = summarizeMetrics(rows, days);

  const fromTables = summary.byTable.reduce((sum, t) => sum + t.count, 0);
  const maxDay = Math.max(1, ...summary.menuByDay.map((d) => d.count));
  const topProducts = summary.products.slice(0, TOP_PRODUCTS);
  const maxProduct = topProducts[0]?.count ?? 0;
  const maxTable = Math.max(summary.withoutTable, ...summary.byTable.map((t) => t.count));
  const maxLink = Math.max(...summary.links.map((l) => l.count));
  const linkTotal = summary.links.reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Métricas</h1>
          <p className="mt-1 text-sm text-brand-ink/70">
            Del {shortDate(days[0])} al {shortDate(days[days.length - 1])}. No se cuentan las visitas desde un navegador donde se entró al panel (tus pruebas no inflan los números).
          </p>
        </div>
        <nav aria-label="Periodo" className="flex gap-1.5">
          {METRIC_RANGES.map((option) => (
            <Link
              key={option}
              href={`/admin/metricas?dias=${option}`}
              aria-current={option === range ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                option === range ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-brand-border hover:bg-brand-sand"
              }`}
            >
              {option} días
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Visitas al menú" value={summary.menuTotal} />
        <Stat label="Desde el QR de una mesa" value={fromTables} />
        <Stat label="Productos abiertos" value={summary.products.reduce((sum, p) => sum + p.count, 0)} />
        <Stat label="Clics a WhatsApp y redes" value={linkTotal} />
      </div>

      <section className={`${cardClass} flex flex-col gap-3`}>
        <h2 className="font-display text-xl font-semibold">Visitas al menú por día</h2>
        {summary.menuTotal === 0 ? (
          <p className="text-sm text-brand-ink/70">Todavía no hay visitas en este periodo.</p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-px" role="img" aria-label={`Visitas al menú por día; máximo ${maxDay} en un día`}>
              {summary.menuByDay.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${shortDate(d.day)}: ${d.count}`}>
                  <span className="block w-full rounded-t-[3px] bg-brand-primary/80 group-hover:bg-brand-primary" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-brand-ink/60">
              <span>{shortDate(days[0])}</span>
              <span>Máximo: {maxDay} en un día</span>
              <span>{shortDate(days[days.length - 1])}</span>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardClass} flex flex-col gap-3`}>
          <h2 className="font-display text-xl font-semibold">Productos más vistos</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-brand-ink/70">Nadie ha abierto un producto en este periodo.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {topProducts.map((p) => (
                <BarRow key={p.id} label={productNames.get(p.id) ?? "Producto borrado"} value={p.count} max={maxProduct} />
              ))}
            </ol>
          )}
          <p className="text-xs text-brand-ink/60">Veces que se abrió el detalle del producto en el menú.</p>
        </section>

        <section className={`${cardClass} flex flex-col gap-3`}>
          <h2 className="font-display text-xl font-semibold">De dónde abren el menú</h2>
          {summary.menuTotal === 0 ? (
            <p className="text-sm text-brand-ink/70">Todavía no hay visitas en este periodo.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {summary.byTable.map((t) => (
                <BarRow key={t.table} label={`QR de la mesa ${t.table}`} value={t.count} max={maxTable} />
              ))}
              <BarRow label="Sin mesa (mostrador, publicidad, link)" value={summary.withoutTable} max={maxTable} />
            </ul>
          )}
        </section>

        <section className={`${cardClass} flex flex-col gap-3`}>
          <h2 className="font-display text-xl font-semibold">Clics en la portada</h2>
          <ul className="flex flex-col gap-3">
            {summary.links.map((l) => (
              <BarRow key={l.key} label={LINK_LABELS[l.key]} value={l.count} max={maxLink} />
            ))}
          </ul>
        </section>

        <section className={`${cardClass} flex flex-col gap-2 text-sm`}>
          <h2 className="font-display text-xl font-semibold">¿Y las visitas a la página?</h2>
          <p className="text-brand-ink/80">
            Cuántas personas entran al sitio y de dónde llegan (Instagram, Google, directo…) se ve en Vercel: vercel.com → el proyecto → pestaña
            &quot;Analytics&quot;. Aquí se cuenta solo lo que Vercel no da gratis.
          </p>
        </section>
      </div>
    </div>
  );
}

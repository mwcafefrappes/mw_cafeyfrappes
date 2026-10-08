import { requireAdminUser } from "@/lib/admin/auth";
import { getBusinessSettingsAdmin } from "@/lib/admin/data";
import { describeNextOpening, getNextOpening } from "@/lib/menu";
import { atTimeEs, formatTimeOfDay, parseTimeFormat, TIME_FORMATS } from "@/lib/time-format";
import { DAY_NAMES, isOpenAt, parseWeeklyHours, summarizeWeeklyHours, timeToMinutes } from "@/lib/weekly-hours";
import { SettingsSection as Section } from "../SettingsSection";
import { Toggle } from "../Toggle";
import { cardClass, hintClass, inputClass } from "../ui";

export const dynamic = "force-dynamic";

/** Lunes primero, como lo lee Franco. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_START = "19:00";
const DEFAULT_END = "23:00";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function AdminHoursPage() {
  await requireAdminUser();
  const settings = await getBusinessSettingsAdmin();
  const hours = parseWeeklyHours(settings.weekly_hours);
  const byDay = new Map(hours.map((entry) => [entry.day, entry]));
  const timeFormat = parseTimeFormat(settings.time_format);
  const lines = summarizeWeeklyHours(hours, timeFormat);
  const now = new Date();
  const open = isOpenAt(hours, now);
  const next = open ? null : getNextOpening(hours, now);
  const sampleMinutes = timeToMinutes(hours[0]?.start ?? DEFAULT_START);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Horario</h1>
        <p className="mt-1 text-sm text-brand-ink/70">
          Se usa en la portada, en el aviso del menú cuando está cerrado y, más adelante, para las horas de los pedidos programados.
        </p>
      </div>

      <section className={`${cardClass} flex flex-col gap-3`}>
        <h2 className="text-sm font-semibold">Así lo ven tus clientes</h2>
        {lines.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {lines.map((line) => (
              <li key={line.days} className="flex flex-wrap justify-between gap-x-4">
                <span className="font-medium">{line.days}</span>
                <span className="tabular-nums text-brand-ink/80">{line.hours}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Todos los días están cerrados: el sitio dice &quot;Cerrado&quot; y no muestra cuándo abren.</p>
        )}
        <p className="inline-flex items-center gap-2 text-sm">
          <span aria-hidden className={`h-2 w-2 rounded-full ${open ? "bg-green-600" : "bg-brand-stone"}`} />
          {open ? "Abierto ahora" : next ? `Cerrado · abrimos ${describeNextOpening(next, timeFormat)}` : "Cerrado"}
        </p>
      </section>

      <Section id="dias" title="Días y horas">
        <div className="flex flex-col divide-y divide-brand-border">
          {WEEK_ORDER.map((day) => {
            const entry = byDay.get(day);
            return (
              <div
                key={day}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 [&:has(input[type=checkbox]:not(:checked))_[data-times]]:opacity-40"
              >
                <div className="w-36">
                  <Toggle name={`open_${day}`} label={capitalize(DAY_NAMES[day])} defaultChecked={Boolean(entry)} />
                </div>
                <div data-times className="flex items-center gap-2 transition-opacity">
                  <input
                    type="time"
                    name={`start_${day}`}
                    aria-label={`Abre el ${DAY_NAMES[day]}`}
                    defaultValue={entry?.start ?? DEFAULT_START}
                    className={`${inputClass} w-32`}
                  />
                  <span className="text-sm text-brand-ink/70">a</span>
                  <input
                    type="time"
                    name={`end_${day}`}
                    aria-label={`Cierra el ${DAY_NAMES[day]}`}
                    defaultValue={entry?.end ?? DEFAULT_END}
                    className={`${inputClass} w-32`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className={hintClass}>
          Apaga los días que no abren. Si cierras después de medianoche, pon la hora en que cierras (por ejemplo, de 7:00 p. m. a 1:00 a. m.).
        </p>
      </Section>

      <Section id="formato" title="Cómo se escribe la hora">
        <p className={hintClass}>Así aparecen las horas en todo el sitio. Ejemplo con tu hora de apertura:</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIME_FORMATS.map((format) => (
            <label
              key={format}
              className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-brand-border bg-brand-cream px-3 py-2.5 text-sm has-[:checked]:border-brand-primary has-[:checked]:ring-1 has-[:checked]:ring-brand-primary"
            >
              <input type="radio" name="time_format" value={format} defaultChecked={format === timeFormat} className="accent-brand-primary" />
              <span>Abrimos {atTimeEs(formatTimeOfDay(sampleMinutes, format))}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

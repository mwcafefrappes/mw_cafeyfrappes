import { saveBusinessSectionAction } from "@/lib/admin/business-actions";
import { cardClass, primaryButtonClass } from "./ui";

/** Tarjeta de /admin/negocio y /admin/horario: un formulario por sección, con su propio Guardar. */
export function SettingsSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <form id={id} action={saveBusinessSectionAction} className={`${cardClass} flex scroll-mt-24 flex-col gap-4`}>
      <input type="hidden" name="section" value={id} />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children}
      <div className="flex justify-end">
        <button type="submit" className={primaryButtonClass}>
          Guardar
        </button>
      </div>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { removeLandingImageAction, uploadLandingImageAction } from "@/lib/admin/landing-actions";
import { ConfirmSubmit } from "../ConfirmSubmit";
import { shrinkImage, submitWithFile } from "../shrink-image";
import { dangerLinkClass, hintClass, secondaryButtonClass } from "../ui";

/** La portada ocupa toda la pantalla en computadora; 2000 px se ve nítido sin pesar de más. */
const MAX_SIDE_PX = 2000;

export function LandingImageUploader({
  sectionKey,
  imageUrl,
  isCustom,
  hint,
}: {
  sectionKey: string;
  imageUrl: string | null;
  /** `false` = se está usando la foto original del sitio. */
  isCustom: boolean;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setWorking(true);
    try {
      submitWithFile(inputRef.current!, await shrinkImage(file, { maxSide: MAX_SIDE_PX, type: "image/jpeg" }));
    } catch {
      setError("No pudimos leer esa imagen. Prueba con una foto JPG o PNG.");
      event.target.value = "";
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative aspect-[16/10] w-48 shrink-0 overflow-hidden rounded-[12px] bg-brand-kraft">
        {imageUrl ? (
          <Image src={imageUrl} alt="Foto actual" fill sizes="192px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-brand-ink/50">Sin foto</span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <form action={uploadLandingImageAction}>
          <input type="hidden" name="key" value={sectionKey} />
          <label className={`${secondaryButtonClass} ${working ? "pointer-events-none opacity-60" : ""}`}>
            {working ? "Preparando foto…" : "Cambiar foto"}
            <input ref={inputRef} type="file" name="image" accept="image/*" onChange={onPick} className="sr-only" />
          </label>
        </form>
        <p className={hintClass}>{hint}</p>
        {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
        {isCustom && (
          <form action={removeLandingImageAction}>
            <input type="hidden" name="key" value={sectionKey} />
            <ConfirmSubmit message="¿Quitar esta foto y volver a la original?" className={dangerLinkClass}>
              Volver a la foto original
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </div>
  );
}

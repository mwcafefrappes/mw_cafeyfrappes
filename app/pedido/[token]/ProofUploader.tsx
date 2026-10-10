"use client";

import { useRef, useState } from "react";
import { uploadPaymentProofAction } from "@/lib/order-actions";
import { shrinkImage, submitWithFile } from "../../admin/(dashboard)/shrink-image";

/** Las capturas se reducen antes de subir (las de celular pueden pesar varios MB). */
const MAX_SIDE_PX = 2000;
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function ProofUploader({ token, hasProof }: { token: string; hasProof: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setState("working");
    try {
      if (file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) throw new Error("El PDF pesa demasiado (máximo 4 MB). Mejor manda una captura.");
        inputRef.current!.form?.requestSubmit();
        return;
      }
      submitWithFile(inputRef.current!, await shrinkImage(file, { maxSide: MAX_SIDE_PX, type: "image/jpeg" }));
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error && caught.message.startsWith("El PDF") ? caught.message : "No pudimos leer ese archivo. Prueba con una captura de pantalla.");
      event.target.value = "";
    }
  };

  return (
    <form action={uploadPaymentProofAction} className="flex flex-col gap-2">
      <input type="hidden" name="token" value={token} />
      <label
        className={`inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
          hasProof ? "border border-brand-ink/30" : "bg-brand-primary text-brand-on-primary"
        } ${state === "working" ? "pointer-events-none opacity-60" : ""}`}
      >
        {state === "working" ? "Subiendo…" : hasProof ? "Cambiar comprobante" : "Subir comprobante"}
        <input ref={inputRef} type="file" name="proof" accept="image/*,application/pdf" onChange={onPick} className="sr-only" />
      </label>
      {error && <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}
    </form>
  );
}

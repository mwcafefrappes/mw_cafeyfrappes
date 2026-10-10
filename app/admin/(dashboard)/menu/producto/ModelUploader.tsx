"use client";

/**
 * Modelo 3D del producto (`docs/3d-ar.md`, etapa 3). El archivo se sube
 * directo del navegador a Supabase Storage con un permiso firmado de un
 * solo uso (no pasa por Vercel, que corta en 4.5 MB); luego el servidor
 * revisa que exista y lo liga al producto.
 */

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { prepareModelUploadAction, removeProductModelAction, saveProductModelAction } from "@/lib/admin/menu-actions";
import { looksLikeModel, megabytes, MODEL_CONTENT_TYPES, modelSizeCheck, RECOMMENDED_MODEL_BYTES, type ModelKind } from "@/lib/models";
import { LONG_CACHE_CONTROL, MENU_MODELS_BUCKET } from "@/lib/storage";
import { ModelViewer3D } from "../../../../ModelViewer3D";
import { ConfirmSubmit } from "../../ConfirmSubmit";
import { dangerLinkClass, hintClass, secondaryButtonClass } from "../../ui";

const LABELS: Record<ModelKind, { upload: string; replace: string; wrongFormat: string }> = {
  glb: { upload: "Subir modelo .glb", replace: "Cambiar modelo .glb", wrongFormat: "Ese archivo no es un modelo .glb." },
  usdz: { upload: "Subir versión para iPhone (.usdz)", replace: "Cambiar versión para iPhone", wrongFormat: "Ese archivo no es un .usdz." },
};

function UploadButton({
  productId,
  kind,
  hasFile,
  supabaseUrl,
  supabaseAnonKey,
  onMessage,
}: {
  productId: string;
  kind: ModelKind;
  hasFile: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  onMessage: (message: { error?: string; info?: string }) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState<string | null>(null);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onMessage({});

    const size = modelSizeCheck(file.size);
    if (size.error) return onMessage({ error: size.error });
    if (!looksLikeModel(kind, new Uint8Array(await file.slice(0, 4).arrayBuffer()))) return onMessage({ error: LABELS[kind].wrongFormat });

    try {
      setWorking("Preparando…");
      const permit = await prepareModelUploadAction(productId, kind, file.size);
      if (!permit.ok) return onMessage({ error: permit.error });

      setWorking(`Subiendo ${megabytes(file.size)}…`);
      const storage = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } }).storage;
      const { error: uploadError } = await storage
        .from(MENU_MODELS_BUCKET)
        .uploadToSignedUrl(permit.path, permit.token, file, { contentType: MODEL_CONTENT_TYPES[kind], cacheControl: LONG_CACHE_CONTROL });
      if (uploadError) return onMessage({ error: "No se pudo subir el archivo. Revisa tu conexión e intenta otra vez." });

      setWorking("Guardando…");
      const saved = await saveProductModelAction(productId, kind, permit.path);
      if (!saved.ok) return onMessage({ error: saved.error });
      onMessage({ info: [kind === "glb" ? "Modelo 3D listo." : "Versión para iPhone lista.", size.warning].filter(Boolean).join(" ") });
      router.refresh();
    } catch {
      onMessage({ error: "Algo falló al subir el modelo. Intenta otra vez." });
    } finally {
      setWorking(null);
    }
  };

  return (
    <label className={`${secondaryButtonClass} ${working ? "pointer-events-none opacity-60" : ""}`}>
      {working ?? (hasFile ? LABELS[kind].replace : LABELS[kind].upload)}
      <input ref={inputRef} type="file" accept={kind === "glb" ? ".glb,model/gltf-binary" : ".usdz,model/vnd.usdz+zip"} onChange={onPick} className="sr-only" />
    </label>
  );
}

export function ModelUploader({
  productId,
  productName,
  glbUrl,
  usdzUrl,
  posterUrl,
  supabaseUrl,
  supabaseAnonKey,
}: {
  productId: string;
  productName: string;
  glbUrl: string | null;
  usdzUrl: string | null;
  posterUrl: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [message, setMessage] = useState<{ error?: string; info?: string }>({});
  const upload = { productId, supabaseUrl, supabaseAnonKey, onMessage: setMessage };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="relative aspect-[4/3] w-56 shrink-0 overflow-hidden rounded-[12px] bg-brand-kraft">
        {glbUrl ? (
          <ModelViewer3D src={glbUrl} iosSrc={usdzUrl} poster={posterUrl} alt={`${productName} en 3D`} className="h-full w-full" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-brand-ink/50">Sin modelo 3D</span>
        )}
      </div>
      <div className="flex max-w-sm flex-col items-start gap-2">
        <UploadButton kind="glb" hasFile={Boolean(glbUrl)} {...upload} />
        {glbUrl && <UploadButton kind="usdz" hasFile={Boolean(usdzUrl)} {...upload} />}
        <p className={hintClass}>
          Con modelo, el cliente ve &quot;Ver en 3D&quot; y, en el celular, &quot;Ver en tu mesa&quot;. Ideal: menos de{" "}
          {megabytes(RECOMMENDED_MODEL_BYTES)} y a tamaño real. La versión para iPhone es opcional: si no la subes, se arma sola.
        </p>
        {message.error && <p className="text-xs text-red-700 dark:text-red-400">{message.error}</p>}
        {message.info && <p className="text-xs text-green-800 dark:text-green-300">{message.info}</p>}
        {usdzUrl && (
          <form action={removeProductModelAction}>
            <input type="hidden" name="id" value={productId} />
            <input type="hidden" name="kind" value="usdz" />
            <ConfirmSubmit message="¿Quitar la versión para iPhone? Se seguirá viendo con la que se arma sola." className={dangerLinkClass}>
              Quitar versión para iPhone
            </ConfirmSubmit>
          </form>
        )}
        {glbUrl && (
          <form action={removeProductModelAction}>
            <input type="hidden" name="id" value={productId} />
            <input type="hidden" name="kind" value="glb" />
            <ConfirmSubmit message="¿Quitar el modelo 3D de este producto?" className={dangerLinkClass}>
              Quitar modelo 3D
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </div>
  );
}

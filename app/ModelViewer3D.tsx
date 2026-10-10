"use client";

/**
 * Vista 3D de un producto con `<model-viewer>` (Google, gratis). Gira con
 * el dedo; en celular, "Ver en tu mesa" abre la cámara: Scene Viewer en
 * Android y Quick Look en iPhone (con el `.usdz` si se subió; si no, lo
 * genera al vuelo). La librería (~1 MB) se descarga solo al abrir el 3D.
 */

import { useEffect, useState } from "react";

export function ModelViewer3D({
  src,
  iosSrc,
  poster,
  alt,
  className = "",
}: {
  src: string;
  iosSrc: string | null;
  poster: string | null;
  alt: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("@google/model-viewer")
      .then(() => active && setReady(true))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return <div className={`flex items-center justify-center bg-brand-kraft text-sm text-brand-ink/70 ${className}`}>No pudimos cargar la vista 3D.</div>;
  }
  if (!ready) {
    return <div className={`animate-pulse bg-brand-kraft ${className}`} aria-label="Cargando la vista 3D…" />;
  }

  return (
    <model-viewer
      src={src}
      {...(iosSrc ? { "ios-src": iosSrc } : {})}
      {...(poster ? { poster } : {})}
      alt={alt}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      touch-action="pan-y"
      loading="eager"
      className={`block bg-brand-kraft ${className}`}
    >
      {/* Solo aparece si el celular puede mostrarlo en realidad aumentada. */}
      <button
        slot="ar-button"
        type="button"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-on-primary shadow-md"
      >
        Ver en tu mesa
      </button>
    </model-viewer>
  );
}

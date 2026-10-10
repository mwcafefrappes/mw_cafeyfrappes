"use client";

/**
 * Mapa para marcar dónde se entrega (decisión 2026-10-09): el pin queda
 * fijo al centro y el cliente mueve el mapa debajo, como en las apps de
 * transporte. OpenStreetMap + Leaflet: gratis y sin llave. Se carga solo
 * en el navegador (`DeliveryMapLoader`).
 */

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

function brandColor(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DeliveryMap({
  store,
  radiusM,
  point,
  onChange,
}: {
  store: LatLng;
  radiusM: number;
  point: LatLng | null;
  onChange: (point: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // El centro solo cuenta como "su casa" cuando el cliente ya movió el mapa o pidió su ubicación.
  const touchedRef = useRef(point !== null);
  const onChangeRef = useRef(onChange);
  const initialPoint = useRef(point);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const map = L.map(containerRef.current!, { zoomControl: true });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const primary = brandColor("--brand-primary", "#6b3f24");
    // La vista va antes que las capas: el círculo necesita un mapa ya posicionado.
    const zoneBounds = L.latLng(store.lat, store.lng).toBounds(radiusM * 2);
    if (initialPoint.current) map.setView([initialPoint.current.lat, initialPoint.current.lng], 17);
    else map.fitBounds(zoneBounds);
    L.circle([store.lat, store.lng], { radius: radiusM, color: primary, weight: 1.5, fillOpacity: 0.07, interactive: false }).addTo(map);
    L.circleMarker([store.lat, store.lng], { radius: 6, color: "#ffffff", weight: 2, fillColor: primary, fillOpacity: 1, interactive: false })
      .bindTooltip("MW", { permanent: true, direction: "right", offset: [6, 0] })
      .addTo(map);

    map.on("dragstart", () => {
      touchedRef.current = true;
    });
    map.on("moveend", () => {
      if (!touchedRef.current) return;
      const center = map.getCenter();
      onChangeRef.current({ lat: center.lat, lng: center.lng });
    });
    // Si cambia el tamaño (giro del celular, teclado), Leaflet tiene que volver a medirse;
    // mientras el cliente no lo mueva, se vuelve a encuadrar la zona completa.
    const resize = new ResizeObserver(() => {
      const center = map.getCenter();
      map.invalidateSize({ pan: false });
      if (touchedRef.current) map.setView(center, map.getZoom(), { animate: false });
      else if (!initialPoint.current) map.fitBounds(zoneBounds, { animate: false });
    });
    resize.observe(containerRef.current!);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [store.lat, store.lng, radiusM]);

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no comparte la ubicación; mueve el mapa hasta tu casa.");
      return;
    }
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        touchedRef.current = true;
        mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 17);
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos ver tu ubicación; mueve el mapa hasta tu casa.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate z-0 h-72 overflow-hidden rounded-[14px] border border-brand-border">
        <div ref={containerRef} className="h-full w-full" aria-label="Mapa: mueve el mapa para poner el pin donde te entregamos" />
        {/* Pin fijo al centro: la punta marca el punto. */}
        <svg
          aria-hidden
          viewBox="0 0 24 36"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[500] h-10 w-7 -translate-x-1/2 -translate-y-full drop-shadow-md"
        >
          <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 36 12 36s12-15.2 12-24.1C24 5.3 18.6 0 12 0z" fill="var(--brand-primary)" />
          <circle cx="12" cy="12" r="4.5" fill="var(--brand-cream)" />
        </svg>
      </div>
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="cursor-pointer self-start rounded-full border border-brand-ink/25 px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {locating ? "Buscando tu ubicación…" : "📍 Usar mi ubicación"}
      </button>
      {geoError && <p className="text-xs text-red-700 dark:text-red-400">{geoError}</p>}
    </div>
  );
}

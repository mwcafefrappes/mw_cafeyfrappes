import { describe, expect, it } from "vitest";
import { distanceLabel, distanceMeters, isLatLng, mapsPointUrl } from "./geo";

const STORE = { lat: 15.7692212, lng: -96.1291265 };

describe("distanceMeters", () => {
  it("mismo punto = 0", () => {
    expect(distanceMeters(STORE, STORE)).toBe(0);
  });

  it("un minuto de latitud ≈ 1.85 km", () => {
    expect(distanceMeters(STORE, { ...STORE, lat: STORE.lat + 1 / 60 })).toBeGreaterThan(1840);
    expect(distanceMeters(STORE, { ...STORE, lat: STORE.lat + 1 / 60 })).toBeLessThan(1860);
  });

  it("La Crucecita a Santa Cruz ≈ 1.6 km en línea recta", () => {
    const crucecita = { lat: 15.7676, lng: -96.1347 };
    const santaCruz = { lat: 15.7531, lng: -96.1316 };
    const meters = distanceMeters(crucecita, santaCruz);
    expect(meters).toBeGreaterThan(1500);
    expect(meters).toBeLessThan(2000);
  });
});

describe("isLatLng", () => {
  it("solo números válidos", () => {
    expect(isLatLng(STORE)).toBe(true);
    expect(isLatLng({ lat: "15", lng: -96 })).toBe(false);
    expect(isLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isLatLng({ lat: Number.NaN, lng: 0 })).toBe(false);
    expect(isLatLng(null)).toBe(false);
  });
});

describe("textos", () => {
  it("metros y km", () => {
    expect(distanceLabel(847)).toBe("850 m");
    expect(distanceLabel(3240)).toBe("3.2 km");
    expect(distanceLabel(5000)).toBe("5 km");
  });

  it("enlace a Maps", () => {
    expect(mapsPointUrl(STORE)).toBe("https://www.google.com/maps/search/?api=1&query=15.769221,-96.129126");
  });
});

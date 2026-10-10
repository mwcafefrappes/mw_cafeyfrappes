/**
 * Google Calendar API v3 directo con `fetch` (portado de Axel Style): un
 * evento en el calendario del negocio por cada pedido programado
 * (CLAUDE.md 5.2), y se borra si se cancela. Sin llaves de Google, solo
 * queda en el log. Nunca rompe el pedido: los errores se registran y se
 * regresa `null`.
 */

import { getGoogleAccessToken, isGoogleConfigured } from "./google-auth";

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

async function callCalendarApi(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await getGoogleAccessToken()}`, "Content-Type": "application/json", ...init.headers },
  });
}

export interface OrderEventInput {
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
}

/** Crea el evento; regresa su id o `null` (sin Google o si falló). */
export async function createOrderEvent(input: OrderEventInput): Promise<string | null> {
  if (!isGoogleConfigured()) {
    console.log("[google-calendar] no configurado; evento simulado", JSON.stringify({ summary: input.summary, start: input.startIso }));
    return null;
  }
  try {
    const response = await callCalendarApi("/events", {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startIso, timeZone: "America/Mexico_City" },
        end: { dateTime: input.endIso, timeZone: "America/Mexico_City" },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("[google-calendar] no se pudo crear el evento", data.error?.message ?? response.status);
      return null;
    }
    return data.id as string;
  } catch (error) {
    console.error("[google-calendar] error al crear el evento", error);
    return null;
  }
}

export async function deleteOrderEvent(eventId: string): Promise<void> {
  if (!isGoogleConfigured()) {
    console.log("[google-calendar] no configurado; borrado simulado", eventId);
    return;
  }
  try {
    const response = await callCalendarApi(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
    // 404/410: ya no existía; no es un error para nosotros.
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      console.error("[google-calendar] no se pudo borrar el evento", eventId, response.status);
    }
  } catch (error) {
    console.error("[google-calendar] error al borrar el evento", eventId, error);
  }
}

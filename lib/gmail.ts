/**
 * Gmail API v1 directo con `fetch` (portado de Axel Style): avisos al
 * negocio por cada pedido nuevo y cancelado (CLAUDE.md 5.4). Sin las
 * llaves de Google o sin `OWNER_NOTIFY_EMAIL`, el correo queda en el log.
 * El correo es secundario: si falla se registra, pero nunca rompe el
 * pedido (ninguna función de aquí lanza excepción).
 */

import { business } from "./config/business";
import { getGoogleAccessToken, isGoogleConfigured } from "./google-auth";

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 2047: para que los acentos del asunto no salgan rotos. */
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

export async function sendOwnerEmail(subject: string, textBody: string): Promise<void> {
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!isGoogleConfigured() || !to) {
    console.log("[gmail] no configurado; correo simulado", JSON.stringify({ subject }));
    return;
  }
  try {
    const raw = toBase64Url(
      [`To: ${to}`, `From: ${business.name} <${to}>`, `Subject: ${encodeSubject(subject)}`, "Content-Type: text/plain; charset=UTF-8", "", textBody].join(
        "\r\n"
      )
    );
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${await getGoogleAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("[gmail] no se pudo mandar el correo", subject, data.error?.message ?? response.status);
    }
  } catch (error) {
    console.error("[gmail] error al mandar el correo", subject, error);
  }
}

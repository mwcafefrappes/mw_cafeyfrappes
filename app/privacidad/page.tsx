import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/lib/config/business";
import { getPublicBusinessSettings } from "@/lib/public-data";
import { LegalContact } from "../LegalContact";

export const metadata: Metadata = {
  title: `Aviso de Privacidad — ${business.name}`,
};

// Los días que se guardan los comprobantes se editan en /admin/negocio; la página se rehace cada hora.
export const revalidate = 3600;

// Borrador hasta confirmar responsable legal, domicilio y correo (P13, P5, P1).
export default async function PrivacyPage() {
  const settings = await getPublicBusinessSettings();
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-foreground">
      <h1 className="font-display text-3xl font-semibold">Aviso de Privacidad</h1>
      <p className="mt-1 text-sm opacity-70">Última actualización: 9 de octubre de 2026</p>

      <p className="mt-6 text-sm leading-relaxed">
        {business.legalResponsibleName}, con nombre comercial &quot;{business.name}&quot;, es responsable del
        tratamiento de los datos personales que usted nos proporcione a través de este sitio, de conformidad con la
        Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
      </p>

      <ol className="mt-8 list-none space-y-6 text-sm leading-relaxed">
        <li>
          <h2 className="font-semibold">1. Identidad y domicilio del responsable</h2>
          <p className="mt-2">
            El responsable es {business.legalResponsibleName}, persona física con actividad empresarial, con domicilio
            en {business.legalAddress}. Puede contactarlo por <LegalContact />.
          </p>
        </li>
        <li>
          <h2 className="font-semibold">2. Finalidades del tratamiento</h2>
          <p className="mt-2">Usamos sus datos personales para:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Recibir, preparar y entregar los pedidos que haga en este sitio.</li>
            <li>Avisarle el estado de su pedido y contactarlo si hay algún problema con él.</li>
            <li>Entregar a domicilio, cuando así lo pida.</li>
            <li>Procesar el pago en línea, cuando elija pagar con tarjeta.</li>
          </ul>
          <p className="mt-2">No usamos sus datos con fines de mercadotecnia ni se los compartimos con fines comerciales.</p>
        </li>
        <li>
          <h2 className="font-semibold">3. Datos personales que recabamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Nombre y número de teléfono.</li>
            <li>Dirección, referencias y el punto que marque en el mapa, solo en pedidos a domicilio.</li>
            <li>Los productos que pide, el total y la hora en que lo quiere.</li>
            <li>
              La captura de su comprobante, si paga por transferencia. Solo la ve el negocio, para confirmar su pago, y se
              borra sola a los {settings.proof_retention_days} días.
            </li>
          </ul>
          <p className="mt-2">
            Los datos de su tarjeta los captura y procesa directamente Stripe; nosotros nunca los vemos ni los
            guardamos. No solicitamos datos personales sensibles.
          </p>
        </li>
        <li>
          <h2 className="font-semibold">4. Cookies y analítica</h2>
          <p className="mt-2">
            Usamos cookies técnicas para mantener la sesión del panel administrativo, y el almacenamiento de su
            navegador para recordar su carrito y sus pedidos recientes en ese mismo dispositivo.
            Medimos visitas de forma anónima (Vercel Analytics), sin cookies de publicidad. También contamos, por día y sin guardar quién lo hizo, cuántas veces se abre el menú, cada producto y los botones de WhatsApp, redes y mapas.
          </p>
        </li>
        <li>
          <h2 className="font-semibold">5. Derechos ARCO</h2>
          <p className="mt-2">
            Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus
            datos, y a revocar su consentimiento. Para ejercerlos, escríbanos por <LegalContact /> indicando su nombre,
            el derecho que desea ejercer y el teléfono con el que hizo su pedido. Respondemos en un plazo máximo de 20
            días hábiles.
          </p>
        </li>
        <li>
          <h2 className="font-semibold">6. Transferencias de datos</h2>
          <p className="mt-2">
            No vendemos ni transferimos sus datos a terceros con fines comerciales. Para operar usamos estos
            proveedores, que procesan datos por nuestra cuenta:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Stripe: pagos en línea con tarjeta, Google Pay y Apple Pay.</li>
            <li>Google (Calendar y Gmail): agenda de pedidos programados y avisos al negocio.</li>
            <li>Supabase: almacenamiento de pedidos y del menú.</li>
            <li>Vercel: hospedaje de este sitio.</li>
            <li>OpenStreetMap: el mapa para marcar su dirección (recibe su conexión al cargar el mapa, no sus datos).</li>
          </ul>
        </li>
        <li>
          <h2 className="font-semibold">7. Eliminación de datos</h2>
          <p className="mt-2">
            Puede pedir que eliminemos sus datos en cualquier momento desde{" "}
            <Link href="/eliminar-datos" className="underline">
              Eliminar mis datos
            </Link>
            .
          </p>
        </li>
        <li>
          <h2 className="font-semibold">8. Cambios a este aviso</h2>
          <p className="mt-2">
            Cualquier cambio a este aviso se publicará en esta misma página, con la fecha de la última actualización.
          </p>
        </li>
      </ol>

      <p className="mt-10 text-sm">
        <Link href="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}

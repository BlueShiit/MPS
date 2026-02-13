exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO_EMAIL = process.env.TO_EMAIL;        // tu correo (donde llegan leads)
    const FROM_EMAIL = process.env.FROM_EMAIL;    // ej: "MPS <no-reply@tudominio.com>" o el que te de Resend

    if (!RESEND_API_KEY || !TO_EMAIL || !FROM_EMAIL) {
      return { statusCode: 500, body: "Faltan variables de entorno (RESEND_API_KEY/TO_EMAIL/FROM_EMAIL)." };
    }

    const data = JSON.parse(event.body || "{}");
    const { kind } = data; // "quote" | "contact"

    // ---- Validación mínima server-side (importantísimo) ----
    if (!kind) return { statusCode: 400, body: "Falta kind." };

    // Contenido del correo para ti (admin)
    let subject = "Nuevo mensaje";
    let html = "<p>Nuevo mensaje recibido.</p>";

    if (kind === "quote") {
      const { tipo_andamio, m2_blitz, kg_allround, ciudad, direccion, empresa, telefono, correo } = data;

      subject = `📩 Nueva cotización (${tipo_andamio || "sin tipo"})`;
      html = `
        <h2>Nueva Cotización</h2>
        <ul>
          <li><b>Tipo:</b> ${tipo_andamio || "-"}</li>
          <li><b>M2 Blitz:</b> ${m2_blitz ?? "-"}</li>
          <li><b>KG Allround:</b> ${kg_allround ?? "-"}</li>
          <li><b>Ciudad:</b> ${ciudad || "-"}</li>
          <li><b>Dirección:</b> ${direccion || "-"}</li>
          <li><b>Empresa:</b> ${empresa || "-"}</li>
          <li><b>Teléfono:</b> ${telefono || "-"}</li>
          <li><b>Correo:</b> ${correo || "-"}</li>
        </ul>
      `;

      // Auto-respuesta al cliente (si hay correo)
      if (correo) {
        await sendResendEmail(RESEND_API_KEY, {
          from: FROM_EMAIL,
          to: correo,
          subject: "✅ Recibimos tu solicitud de cotización (MPS)",
          html: `
            <p>Hola,</p>
            <p>Gracias por contactarnos. Recibimos tu solicitud de cotización y te responderemos a la brevedad.</p>
            <p><b>Resumen:</b> ${tipo_andamio || "-"} / ${ciudad || "-"}</p>
            <p>— MPS Andamios</p>
          `,
        });
      }
    }

    if (kind === "contact") {
      const { nombre, correo, mensaje } = data;

      subject = `💬 Nuevo mensaje de contacto (${nombre || "sin nombre"})`;
      html = `
        <h2>Nuevo Mensaje de Contacto</h2>
        <ul>
          <li><b>Nombre:</b> ${nombre || "-"}</li>
          <li><b>Correo:</b> ${correo || "-"}</li>
        </ul>
        <p><b>Mensaje:</b></p>
        <p>${escapeHtml(mensaje || "-").replace(/\n/g, "<br/>")}</p>
      `;

      // Auto-respuesta al cliente (si hay correo)
      if (correo) {
        await sendResendEmail(RESEND_API_KEY, {
          from: FROM_EMAIL,
          to: correo,
          subject: "✅ Recibimos tu mensaje (MPS)",
          html: `
            <p>Hola ${nombre || ""},</p>
            <p>Gracias por escribirnos. Tu mensaje fue recibido y te contactaremos pronto.</p>
            <p>— MPS Andamios</p>
          `,
        });
      }
    }

    // Correo interno para ti (siempre)
    await sendResendEmail(RESEND_API_KEY, {
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      html,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err.message || err) }) };
  }
};

async function sendResendEmail(apiKey, payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error: ${res.status} ${txt}`);
  }
  return res.json();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// netlify/functions/send-mail.js
const nodemailer = require("nodemailer");

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailClienteHTML({ tipo, ciudad, direccion, empresa, telefono, correo, m2_blitz, kg_allround }) {
  const detalleMedida =
    tipo === "blitz"
      ? `<p style="margin:0;"><b>M² estimados:</b> ${m2_blitz ?? "-"}</p>`
      : tipo === "allround"
      ? `<p style="margin:0;"><b>KG estimados:</b> ${kg_allround ?? "-"}</p>`
      : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e9f2;">
      <div style="background:#0f172a;color:#fff;padding:18px 22px;">
        <h2 style="margin:0;font-size:18px;letter-spacing:.2px;">MPS Andamios</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.9;">Confirmación de solicitud de cotización</p>
      </div>

      <div style="padding:20px 22px;color:#0f172a;">
        <p style="margin:0 0 12px;">Hola <b>${escapeHtml(empresa || "!" )}</b>,</p>
        <p style="margin:0 0 14px;">
          Recibimos tu solicitud de cotización. Un integrante de nuestro equipo te contactará a la brevedad.
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 14px;margin:14px 0;">
          <p style="margin:0 0 8px;font-weight:700;">Resumen</p>
          <p style="margin:0;"><b>Tipo de andamio:</b> ${escapeHtml(tipo || "-")}</p>
          ${detalleMedida}
          <p style="margin:0;"><b>Ciudad:</b> ${escapeHtml(ciudad || "-")}</p>
          <p style="margin:0;"><b>Dirección:</b> ${escapeHtml(direccion || "-")}</p>
          <p style="margin:0;"><b>Teléfono:</b> ${escapeHtml(telefono || "-")}</p>
          <p style="margin:0;"><b>Correo:</b> ${escapeHtml(correo || "-")}</p>
        </div>

        <p style="margin:14px 0 0;font-size:13px;color:#334155;">
          Si necesitas agregar información (planos, alturas, plazos), responde este correo y lo sumamos a tu solicitud.
        </p>
      </div>

      <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
        <p style="margin:0;">© ${new Date().getFullYear()} MPS Montajes Profesionales & Soluciones</p>
      </div>
    </div>
  </div>`;
}

function emailAdminHTML({ tipo, ciudad, direccion, empresa, telefono, correo, m2_blitz, kg_allround, origen }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;">
    <h2>Nueva solicitud (${escapeHtml(origen || "form")})</h2>
    <ul>
      <li><b>Tipo:</b> ${escapeHtml(tipo || "-")}</li>
      <li><b>M2 Blitz:</b> ${m2_blitz ?? "-"}</li>
      <li><b>KG Allround:</b> ${kg_allround ?? "-"}</li>
      <li><b>Ciudad:</b> ${escapeHtml(ciudad || "-")}</li>
      <li><b>Dirección:</b> ${escapeHtml(direccion || "-")}</li>
      <li><b>Empresa:</b> ${escapeHtml(empresa || "-")}</li>
      <li><b>Teléfono:</b> ${escapeHtml(telefono || "-")}</li>
      <li><b>Correo:</b> ${escapeHtml(correo || "-")}</li>
    </ul>
  </div>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Variables Netlify (las 5 que creaste)
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      MAIL_TO, // tu correo destino (admin)
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "Faltan variables SMTP/MAIL_TO en Netlify." }),
      };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // 465 true, 587 false
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const asunto = data.origen === "contacto"
      ? "Nuevo mensaje desde Contacto (MPS)"
      : "Nueva solicitud de Cotización (MPS)";

    // 1) correo al admin
    await transporter.sendMail({
      from: `"MPS Web" <${SMTP_USER}>`,
      to: MAIL_TO,
      subject: asunto,
      html: emailAdminHTML(data),
    });

    // 2) correo al cliente (si hay correo)
    if (data.correo) {
      await transporter.sendMail({
        from: `"MPS Andamios" <${SMTP_USER}>`,
        to: data.correo,
        subject: "Recibimos tu solicitud ✅ (MPS)",
        html: emailClienteHTML(data),
        replyTo: MAIL_TO, // si responden, te llega a ti
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("send-mail error:", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Error enviando correo." }) };
  }
};

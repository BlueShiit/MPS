// ============================
// MPS — main.js (carrusel + utilidades + contacto + cotización + Supabase)
// ============================

// ============================
// 0) SUPABASE CONFIG (1 sola vez)
// ============================
// Requisitos en el HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="js/main.js"></script>
const SUPABASE_URL = "https://orwnsptmtraujxmeqwph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aLZbgzCt2ahyxFkVMD4AqQ_TcaTTV-Y";

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!window.supabase?.createClient) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Cliente único (evita duplicaciones / listeners raros)
const sb = getSupabaseClient();

// Helpers de envío (usan tus tablas reales)
async function sendContactToSupabase(payload) {
  if (!sb) return { ok: false, error: "Supabase no está cargado (revisa el CDN en index.html)." };
  const { error } = await sb.from("contactos").insert([payload]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function sendQuoteToSupabase(payload) {
  if (!sb) return { ok: false, error: "Supabase no está cargado (revisa el CDN en index.html)." };
  const { error } = await sb.from("cotizaciones").insert([payload]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================
// 1) Año dinámico en el footer
// ============================
// Auto-abrir modal de cotización si la URL tiene ?cotizar=1
if (new URLSearchParams(window.location.search).get("cotizar") === "1") {
  window.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("quote-modal");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      history.replaceState(null, "", window.location.pathname);
    }
  });
}


const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ============================
// 2) Scroll suave para anclas internas (solo si existe el target)
// ============================
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;

  const href = a.getAttribute("href");
  if (!href || href === "#") return;

  const target = document.querySelector(href);
  if (!target) return;

  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  history.pushState(null, "", href);
});

// ============================
// 3) Hero Slider (Inicio)
// ============================
(function initHeroSlider() {
  const carousel = document.querySelector("#inicio .carousel");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".slide"));
  const prevBtn = carousel.querySelector(".ctrl.prev");
  const nextBtn = carousel.querySelector(".ctrl.next");
  const dotsWrap = carousel.querySelector(".dots");

  const autoplayEnabled = carousel.getAttribute("data-autoplay") !== "false";
  const intervalMs = Number(carousel.getAttribute("data-interval")) || 6000;

  let current = slides.findIndex((s) => s.classList.contains("is-active"));
  if (current < 0) current = 0;

  let timerId = null;
  let isPaused = false;
  let startX = null;

  slides.forEach((s, i) => {
    s.setAttribute("role", "group");
    s.setAttribute("aria-roledescription", "diapositiva");
    s.setAttribute("aria-label", `Diapositiva ${i + 1} de ${slides.length}`);
    s.setAttribute("aria-hidden", i === current ? "false" : "true");
  });

  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", `Ir a la diapositiva ${i + 1}`);
    b.addEventListener("click", () => goTo(i));
    dotsWrap?.appendChild(b);
    return b;
  });

  function updateUI() {
    slides.forEach((s, i) => {
      const active = i === current;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", active ? "false" : "true");
    });

    dots.forEach((d, i) => {
      const active = i === current;
      d.classList.toggle("active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
      d.setAttribute("tabindex", active ? "0" : "-1");
    });
  }

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    updateUI();
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  nextBtn?.addEventListener("click", next);
  prevBtn?.addEventListener("click", prev);

  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
  });

  function startAutoplay() {
    if (!autoplayEnabled || isPaused || timerId) return;
    timerId = setInterval(next, intervalMs);
  }
  function stopAutoplay() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  carousel.addEventListener("mouseenter", () => { isPaused = true; stopAutoplay(); });
  carousel.addEventListener("mouseleave", () => { isPaused = false; startAutoplay(); });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  carousel.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const delta = e.changedTouches[0].clientX - startX;
    startX = null;
    const threshold = 40;
    if (delta > threshold) prev();
    else if (delta < -threshold) next();
  });

  updateUI();
  startAutoplay();
})();

// ============================
// Algoritmo de cotización
// ============================
const PRICING = {
  blitz: {
    tramos: [
      { hasta: 100,  precio: 4200 },
      { hasta: 300,  precio: 3600 },
      { hasta: 1000, precio: 3000 },
      { hasta: 5000, precio: 2500 },
    ],
    unidad: "m²",
  },
  allround: {
    tramos: [
      { hasta: 2000,  precio: 380 },
      { hasta: 10000, precio: 320 },
      { hasta: 30000, precio: 260 },
      { hasta: 50000, precio: 200 },
    ],
    unidad: "kg",
  },
};

function calcularPrecio(tipo, cantidad) {
  const config = PRICING[tipo];
  if (!config || !cantidad || cantidad <= 0) return null;
  const tramo = config.tramos.find(t => cantidad <= t.hasta) || config.tramos[config.tramos.length - 1];
  const neto  = cantidad * tramo.precio;
  const iva   = Math.round(neto * 0.19);
  const total = neto + iva;
  return { cantidad, unidad: config.unidad, precioUnitario: tramo.precio, neto, iva, total };
}

function formatCLP(n) {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

// ============================
// Form helpers: autocomplete + validación inline
// ============================
(function initFormHelpers() {
  const form = document.getElementById("quote-form");
  if (!form) return;

  // --- Indicador de estado (borde + hint) ---
  function getHint(field) {
    let h = field.querySelector(".field-hint");
    if (!h) { h = document.createElement("small"); h.className = "field-hint"; field.appendChild(h); }
    return h;
  }

  function setStatus(input, state, msg) {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.remove("field--valid", "field--invalid");
    if (state === "valid")   field.classList.add("field--valid");
    if (state === "invalid") field.classList.add("field--invalid");
    const hint = getHint(field);
    hint.textContent = msg || "";
    hint.className = "field-hint" + (state === "invalid" ? " field-hint--error" : state === "valid" ? " field-hint--ok" : "");
  }

  // --- Lista de ciudades y comunas de Chile ---
  const CIUDADES_CL = [
    "Santiago","Puente Alto","Maipú","La Florida","Las Condes","Ñuñoa",
    "Providencia","Vitacura","Lo Barnechea","Peñalolén","San Miguel","San Bernardo",
    "Quilicura","La Reina","Macul","Pudahuel","Conchalí","Huechuraba","Recoleta",
    "Independencia","Cerro Navia","Lo Espejo","Lo Prado","Renca","Cerrillos",
    "Estación Central","El Bosque","La Granja","La Pintana","La Cisterna",
    "San Joaquín","Pedro Aguirre Cerda","Colina","Buin","Melipilla","Talagante",
    "Padre Hurtado","Antofagasta","Calama","Viña del Mar","Valparaíso","San Antonio",
    "Temuco","Concepción","Talcahuano","La Serena","Coquimbo","Iquique",
    "Puerto Montt","Talca","Rancagua","Osorno","Punta Arenas","Arica","Chillán",
    "Los Ángeles","Valdivia","Copiapó","Ovalle","Curicó","Linares","San Fernando","Angol",
  ];

  // --- Autocomplete de dirección con Nominatim (Chile) ---
  const inputDir    = document.getElementById("direccion");
  const inputCiudad = document.getElementById("ciudad");

  if (inputDir) {
    inputDir.setAttribute("autocomplete", "off");
    const field = inputDir.closest(".field");

    const list = document.createElement("ul");
    list.className = "ac-list";
    list.hidden = true;
    field.appendChild(list);

    let timer;

    inputDir.addEventListener("input", () => {
      setStatus(inputDir, null);
      clearTimeout(timer);
      const q = inputDir.value.trim();
      if (q.length < 5) { list.innerHTML = ""; list.hidden = true; return; }

      list.innerHTML = '<li class="ac-item ac-loading">Buscando…</li>';
      list.hidden = false;

      timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&countrycodes=cl&addressdetails=1&limit=6&q=${encodeURIComponent(q + ", Chile")}`,
            { headers: { "Accept-Language": "es-CL,es" } }
          );
          const data = await res.json();
          list.innerHTML = "";
          if (!data.length) {
            list.innerHTML = '<li class="ac-item ac-empty">Sin resultados en Chile</li>';
            return;
          }
          data.forEach(item => {
            const a = item.address || {};
            const street = [a.road, a.house_number].filter(Boolean).join(" ");
            const city   = a.city || a.town || a.village || a.municipality || a.county || "";
            const region = a.state || "";
            const label  = street || item.display_name.split(",")[0].trim();
            const li = document.createElement("li");
            li.className = "ac-item";
            li.innerHTML = `<span class="ac-main">${label}</span><span class="ac-sub">${[city, region].filter(Boolean).join(", ")}</span>`;
            li.addEventListener("mousedown", e => {
              e.preventDefault();
              inputDir.value = label;
              if (inputCiudad && city) { inputCiudad.value = city; setStatus(inputCiudad, "valid", ""); }
              setStatus(inputDir, "valid", "");
              list.hidden = true;
            });
            list.appendChild(li);
          });
          list.hidden = false;
        } catch { list.hidden = true; }
      }, 450);
    });

    inputDir.addEventListener("blur",    () => setTimeout(() => { list.hidden = true; }, 200));
    inputDir.addEventListener("keydown", e => { if (e.key === "Escape") list.hidden = true; });
  }

  // --- Autocomplete custom de ciudad ---
  if (inputCiudad) {
    inputCiudad.setAttribute("autocomplete", "off");
    const fieldC = inputCiudad.closest(".field");

    const listC = document.createElement("ul");
    listC.className = "ac-list";
    listC.hidden = true;
    fieldC.appendChild(listC);

    function renderCiudades(q) {
      const matches = CIUDADES_CL.filter(c =>
        c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
          .includes(q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
      ).slice(0, 8);

      listC.innerHTML = "";
      if (!matches.length) { listC.hidden = true; return; }

      matches.forEach(ciudad => {
        const li = document.createElement("li");
        li.className = "ac-item";
        li.innerHTML = `<span class="ac-main">${ciudad}</span>`;
        li.addEventListener("mousedown", e => {
          e.preventDefault();
          inputCiudad.value = ciudad;
          setStatus(inputCiudad, "valid", "");
          listC.hidden = true;
        });
        listC.appendChild(li);
      });
      listC.hidden = false;
    }

    inputCiudad.addEventListener("input", () => {
      const q = inputCiudad.value.trim();
      if (q.length < 2) { listC.innerHTML = ""; listC.hidden = true; return; }
      renderCiudades(q);
    });

    inputCiudad.addEventListener("blur",    () => setTimeout(() => { listC.hidden = true; }, 200));
    inputCiudad.addEventListener("keydown", e => { if (e.key === "Escape") listC.hidden = true; });
  }

  // --- Teléfono con prefijo ---
  const inputTel    = document.getElementById("telefono");
  const inputPrefijo = document.getElementById("telefono-prefijo");
  if (inputTel) {
    const PHONE_EXAMPLES = {
      "+56":  "9 1234 5678",
      "+54":  "11 1234 5678",
      "+51":  "9 1234 5678",
      "+591": "7 123 4567",
    };

    function updatePlaceholder() {
      const prefijo = inputPrefijo?.value || "+56";
      inputTel.placeholder = PHONE_EXAMPLES[prefijo] || "123 456 789";
    }

    function validateTel() {
      const digits  = inputTel.value.replace(/\D/g, "");
      const prefijo = inputPrefijo?.value || "+56";
      let ok = false;
      if (prefijo === "+56") {
        ok = /^9\d{8}$/.test(digits);
      } else {
        ok = digits.length >= 7 && digits.length <= 12;
      }
      const ejemplo = PHONE_EXAMPLES[prefijo] || "123 456 789";
      if (digits.length > 3) setStatus(inputTel, ok ? "valid" : "invalid", ok ? "" : `Ej: ${ejemplo}`);
      else setStatus(inputTel, null);
    }

    updatePlaceholder();
    inputTel.addEventListener("input", validateTel);
    inputPrefijo?.addEventListener("change", () => {
      updatePlaceholder();
      setStatus(inputTel, null);
      if (inputTel.value) validateTel();
    });
  }

  // --- Correo ---
  const inputEmail = document.getElementById("correo");
  if (inputEmail) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    inputEmail.addEventListener("input", () => {
      const v = inputEmail.value.trim();
      if (v.length > 5) setStatus(inputEmail, re.test(v) ? "valid" : "invalid", re.test(v) ? "" : "Formato inválido, ej: nombre@empresa.cl");
      else setStatus(inputEmail, null);
    });
  }

  // --- Empresa ---
  const inputEmpresa = document.getElementById("empresa");
  if (inputEmpresa) {
    inputEmpresa.addEventListener("blur", () => {
      const v = inputEmpresa.value.trim();
      setStatus(inputEmpresa, v.length >= 2 ? "valid" : "invalid", v.length < 2 ? "Ingresa el nombre de la empresa" : "");
    });
    inputEmpresa.addEventListener("input", () => {
      if (inputEmpresa.value.trim().length >= 2) setStatus(inputEmpresa, "valid", "");
      else setStatus(inputEmpresa, null);
    });
  }

  // --- Campos numéricos (m² y kg) ---
  [
    { id: "m2-blitz",    min: 20,  max: 5000,  unit: "m²" },
    { id: "kg-allround", min: 500, max: 50000, unit: "kg" },
  ].forEach(({ id, min, max, unit }) => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener("input", () => {
      if (!inp.value) { setStatus(inp, null); return; }
      const v = Number(inp.value);
      const ok = v >= min && v <= max;
      setStatus(inp, ok ? "valid" : "invalid", ok ? "" : `Debe estar entre ${min.toLocaleString("es-CL")} y ${max.toLocaleString("es-CL")} ${unit}`);
      actualizarCajaPrecio();
    });
  });

  // --- Caja de precio estimado ---
  const quoteActions = form.querySelector(".quote-actions");
  const cajaPrecio = document.createElement("div");
  cajaPrecio.id = "precio-estimado";
  cajaPrecio.className = "precio-box";
  cajaPrecio.hidden = true;
  quoteActions?.parentElement.insertBefore(cajaPrecio, quoteActions);

  const tipoSel = document.getElementById("tipo-andamio");
  tipoSel?.addEventListener("change", actualizarCajaPrecio);

  function actualizarCajaPrecio() {
    const tipo = tipoSel?.value;
    const cantidad = tipo === "blitz"
      ? Number(document.getElementById("m2-blitz")?.value) || 0
      : Number(document.getElementById("kg-allround")?.value) || 0;

    const p = calcularPrecio(tipo, cantidad);
    if (!p) { cajaPrecio.hidden = true; return; }

    cajaPrecio.hidden = false;
    cajaPrecio.innerHTML = `
      <p class="precio-box-title">Estimación de precio</p>
      <div class="precio-box-row">
        <span>${p.cantidad.toLocaleString("es-CL")} ${p.unidad} × ${formatCLP(p.precioUnitario)}/${p.unidad}</span>
        <span>${formatCLP(p.neto)}</span>
      </div>
      <div class="precio-box-row">
        <span>IVA (19%)</span>
        <span>${formatCLP(p.iva)}</span>
      </div>
      <hr class="precio-box-divider">
      <div class="precio-box-total">
        <span>Total estimado</span>
        <span>${formatCLP(p.total)}</span>
      </div>
      <p class="precio-box-nota">Valor referencial neto + IVA. El precio final puede variar según altura, accesos y condiciones específicas de la obra.</p>
    `;
  }
})();

// ===== Reiniciar animaciones del texto en cada cambio de slide =====
(function initSlideTextAnimations() {
  const allSlides = document.querySelectorAll(".slide");
  if (!allSlides.length) return;

  function resetAnimations(slide) {
    const elements = slide.querySelectorAll(".animate");
    elements.forEach((el) => {
      el.classList.remove("animate");
      void el.offsetWidth;
      el.classList.add("animate");
    });
  }

  const observer = new MutationObserver(() => {
    const activeSlide = document.querySelector(".slide.is-active");
    if (activeSlide) resetAnimations(activeSlide);
  });

  allSlides.forEach((slide) => {
    observer.observe(slide, { attributes: true, attributeFilter: ["class"] });
  });
})();

// ============================
// 4) Scroll Reveal
// ============================
(function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  elements.forEach((el) => io.observe(el));
})();

// ============================
// 5) Widget Contacto (UI + Submit a Supabase) [SOLO 1 SUBMIT]
// ============================
const contactToggle = document.querySelector(".contact-toggle");
const contactPanel  = document.querySelector(".contact-panel");
const contactClose  = document.querySelector(".contact-close");
const widgetForm    = document.getElementById("widget-form");
const widgetMsg     = document.getElementById("w-msg");

if (contactToggle && contactPanel) {
  contactToggle.addEventListener("click", () => {
    contactPanel.classList.toggle("is-open");
  });
}

if (contactClose && contactPanel) {
  contactClose.addEventListener("click", () => {
    contactPanel.classList.remove("is-open");
  });
}

if (widgetForm && widgetMsg) {
  widgetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre  = document.getElementById("w-nombre")?.value.trim();
    const correo  = document.getElementById("w-correo")?.value.trim();
    const mensaje = document.getElementById("w-mensaje")?.value.trim();

    if (!nombre || !correo || !mensaje) {
      widgetMsg.textContent = "Por favor completa todos los campos.";
      widgetMsg.style.color = "red";
      return;
    }

    widgetMsg.textContent = "Enviando…";
    widgetMsg.style.color = "#334155";

    const res = await sendContactToSupabase({
      nombre,
      correo,
      mensaje,
      created_at: new Date().toISOString(),
    });

    if (!res.ok) {
      console.error("Supabase contactos:", res.error);
      widgetMsg.textContent = "❌ No se pudo enviar. Revisa la consola (F12).";
      widgetMsg.style.color = "red";
      return;
    }

    widgetMsg.textContent = "✅ Mensaje enviado. Te contactaremos pronto.";
    widgetMsg.style.color = "green";
    widgetForm.reset();
  });
}

// ============================
// 6) Cotización Rápida (Modal + Submit a Supabase) [SOLO 1 SUBMIT]
// ============================
const btnCotizacion   = document.getElementById("btn-cotizacion");
const quoteModal      = document.getElementById("quote-modal");
const quoteBackdrop   = document.getElementById("quote-backdrop");
const quoteClose      = document.querySelector(".quote-close");
const quoteCancelar   = document.getElementById("quote-cancelar");
const quoteForm       = document.getElementById("quote-form");
const tipoAndamioSel  = document.getElementById("tipo-andamio");
const campoBlitz      = document.getElementById("campo-blitz");
const campoAllround   = document.getElementById("campo-allround");
const inputM2Blitz    = document.getElementById("m2-blitz");
const inputKgAllround = document.getElementById("kg-allround");

// Elemento de éxito (creado dinámicamente dentro del .quote-card)
let quoteSuccessEl = null;
const quoteCard = document.querySelector(".quote-card");
if (quoteCard && quoteForm) {
  quoteSuccessEl = document.createElement("div");
  quoteSuccessEl.className = "quote-success";
  quoteSuccessEl.hidden = true;
  quoteSuccessEl.innerHTML = `
    <div class="quote-success-icon">✓</div>
    <h3>¡Cotización enviada!</h3>
    <p>Te contactaremos a la brevedad.</p>
    <button type="button" class="cta cta-cotizar">Cerrar</button>
  `;
  quoteSuccessEl.querySelector("button").addEventListener("click", cerrarCotizacion);
  quoteCard.appendChild(quoteSuccessEl);
}

// 🔒 Teléfono: permitir solo números, + y espacios
const inputTelefono = document.getElementById("telefono");

if (inputTelefono) {
  inputTelefono.addEventListener("input", () => {
    inputTelefono.value = inputTelefono.value.replace(/[^0-9+ ]/g, "");
  });
}

function abrirCotizacion() {
  if (!quoteModal) return;
  quoteModal.classList.add("is-open");
  quoteModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function cerrarCotizacion() {
  if (!quoteModal) return;
  quoteModal.classList.remove("is-open");
  quoteModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  // Restaurar formulario y limpiar estados
  if (quoteSuccessEl) quoteSuccessEl.hidden = true;
  quoteCard?.querySelector("h2")?.removeAttribute("hidden");
  quoteCard?.querySelector(".muted.tiny")?.removeAttribute("hidden");
  if (quoteForm) {
    quoteForm.hidden = false;
    quoteForm.reset();
    quoteForm.querySelectorAll(".field").forEach(f => {
      f.classList.remove("field--valid", "field--invalid");
      const hint = f.querySelector(".field-hint");
      if (hint) hint.textContent = "";
    });
    actualizarCampos();
    const cajaPrecio = document.getElementById("precio-estimado");
    if (cajaPrecio) cajaPrecio.hidden = true;
  }
}

function actualizarCampos() {
  if (!tipoAndamioSel || !campoBlitz || !campoAllround || !inputM2Blitz || !inputKgAllround) return;

  const tipo = tipoAndamioSel.value;

  if (tipo === "blitz") {
    campoBlitz.style.display = "block";
    campoAllround.style.display = "none";
    inputM2Blitz.required = true;
    inputKgAllround.required = false;
    inputKgAllround.value = "";
  } else if (tipo === "allround") {
    campoBlitz.style.display = "none";
    campoAllround.style.display = "block";
    inputM2Blitz.required = false;
    inputKgAllround.required = true;
    inputM2Blitz.value = "";
  } else {
    campoBlitz.style.display = "none";
    campoAllround.style.display = "none";
    inputM2Blitz.required = false;
    inputKgAllround.required = false;
    inputM2Blitz.value = "";
    inputKgAllround.value = "";
  }
}

actualizarCampos();

btnCotizacion?.addEventListener("click", (e) => {
  e.preventDefault();
  abrirCotizacion();
});

document.querySelectorAll(".js-abrir-cotizacion").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    abrirCotizacion();
  });
});

quoteBackdrop?.addEventListener("click", cerrarCotizacion);
quoteClose?.addEventListener("click", cerrarCotizacion);
quoteCancelar?.addEventListener("click", cerrarCotizacion);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && quoteModal?.classList.contains("is-open")) {
    cerrarCotizacion();
  }
});

tipoAndamioSel?.addEventListener("change", () => {
  actualizarCampos();
  const tipoField = tipoAndamioSel.closest(".field");
  if (tipoField) {
    tipoField.classList.remove("field--invalid");
    const hint = tipoField.querySelector(".field-hint");
    if (hint) hint.textContent = "";
  }
});

// SUBMIT cotización -> Supabase (tabla cotizaciones)
quoteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 0) Validar que se haya seleccionado tipo de andamio
  if (!tipoAndamioSel?.value) {
    const tipoField = tipoAndamioSel?.closest(".field");
    if (tipoField) {
      tipoField.classList.add("field--invalid");
      let hint = tipoField.querySelector(".field-hint");
      if (!hint) {
        hint = document.createElement("small");
        hint.className = "field-hint field-hint--error";
        tipoField.appendChild(hint);
      }
      hint.className = "field-hint field-hint--error";
      hint.textContent = "Selecciona el tipo de andamio";
      tipoAndamioSel.focus();
    }
    return;
  }

  // 1) Validación HTML5 (required, min, max, etc.)
  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  const tipo_andamio = tipoAndamioSel?.value || "";
  const m2_blitz = inputM2Blitz?.value ? Number(inputM2Blitz.value) : null;
  const kg_allround = inputKgAllround?.value ? Number(inputKgAllround.value) : null;

  const ciudad    = document.getElementById("ciudad")?.value.trim();
  const direccion = document.getElementById("direccion")?.value.trim();
  const empresa   = document.getElementById("empresa")?.value.trim();
  const telefonoRaw = document.getElementById("telefono")?.value.trim();
  const prefijo     = document.getElementById("telefono-prefijo")?.value || "+56";
  const correo    = document.getElementById("correo")?.value.trim();

  // 2) Validar correo (más estricto que el input type=email)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!emailRegex.test(correo)) {
    alert("❌ Ingresa un correo válido (ej: nombre@empresa.cl)");
    return;
  }

  // 3) Validar y normalizar teléfono según prefijo
  const digits = telefonoRaw.replace(/\D/g, "");
  let telefono;

  if (prefijo === "+56") {
    if (/^9\d{8}$/.test(digits)) {
      telefono = "56" + digits;
    } else if (/^569\d{8}$/.test(digits)) {
      telefono = digits;
    } else {
      alert("❌ Ingresa un teléfono válido de Chile (ej: 9 1234 5678)");
      return;
    }
  } else {
    if (digits.length < 7 || digits.length > 12) {
      alert("❌ Ingresa un número de teléfono válido");
      return;
    }
    telefono = prefijo + digits;
  }

  // 4) Calcular precio
  const cantidad = tipo_andamio === "blitz" ? m2_blitz : kg_allround;
  const precio = calcularPrecio(tipo_andamio, cantidad);

  // 5) Guardar en Supabase — intenta con precio, si falla reintenta sin él
  const payloadBase = {
    tipo_andamio, m2_blitz, kg_allround,
    ciudad, direccion, empresa, telefono, correo,
    created_at: new Date().toISOString(),
  };

  const payloadConPrecio = {
    ...payloadBase,
    precio_unitario: precio?.precioUnitario ?? null,
    precio_neto:     precio?.neto ?? null,
    precio_iva:      precio?.iva ?? null,
    precio_total:    precio?.total ?? null,
  };

  let res = await sendQuoteToSupabase(payloadConPrecio);

  if (!res.ok) {
    // Si el error es por columnas inexistentes, reintenta sin precio
    const esMissingColumn = res.error?.includes("column") || res.error?.includes("does not exist");
    if (esMissingColumn) {
      console.warn("Columnas de precio no existen en Supabase, guardando sin precio.");
      res = await sendQuoteToSupabase(payloadBase);
    }
    if (!res.ok) {
      console.error("Supabase cotizaciones:", res.error);
      alert("❌ No se pudo enviar la cotización. Revisa la consola (F12).");
      return;
    }
  }

  // 5) ✅ Registrar también en Netlify Forms (para Email notifications)
  // Requiere que tu <form> tenga:
  // name="cotizacion" data-netlify="true" method="POST"
  // + <input type="hidden" name="form-name" value="cotizacion">
  try {
    const fd = new FormData(quoteForm);

    // OJO: aquí aseguramos que el teléfono que se manda a Netlify sea el normalizado
    fd.set("telefono", telefono);

    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fd).toString(),
    });
  } catch (err) {
    console.warn("Netlify Forms no pudo registrar el envío:", err);
    // No lo bloqueamos porque Supabase ya guardó OK
  }

  // ✅ Enviar mail automático (admin + confirmación cliente)
try {
  await fetch("/.netlify/functions/send-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origen: "cotizacion",
      tipo: tipo_andamio,
      m2_blitz,
      kg_allround,
      ciudad,
      direccion,
      empresa,
      telefono,
      correo,
      precio,
    }),
  });
} catch (e) {
  console.warn("No se pudo enviar correo automático:", e);
}

  // 6) UI: mostrar mensaje de éxito dentro del modal
  if (quoteSuccessEl && quoteForm) {
    quoteForm.hidden = true;
    quoteCard?.querySelector("h2")?.setAttribute("hidden", "");
    quoteCard?.querySelector(".muted.tiny")?.setAttribute("hidden", "");
    quoteSuccessEl.hidden = false;
  } else {
    quoteForm.reset();
    actualizarCampos();
    cerrarCotizacion();
  }
});

// ============================
// Navbar mobile (hamburguesa)
// ============================
(function initMobileNav() {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".topbar .nav");
  if (!navToggle || !nav) return;

  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".topbar")) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
})();

// ============================
// Slider de proyectos + lightbox
// ============================
(function initProjectGallery() {
  const galleries = document.querySelectorAll(".project-gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");

  let currentGalleryImages = [];
  let currentLightboxIndex = 0;

  function updateLightboxImage() {
    if (!lightboxImg || !currentGalleryImages.length) return;

    const currentImg = currentGalleryImages[currentLightboxIndex];
    if (!currentImg) return;

    lightboxImg.src = currentImg.src;
    lightboxImg.alt = currentImg.alt || "Imagen ampliada";
  }

  function openLightbox(images, index) {
    if (!lightbox) return;

    currentGalleryImages = images;
    currentLightboxIndex = index >= 0 ? index : 0;

    updateLightboxImage();
    lightbox.classList.add("active");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("active");
  }

  function showNextLightboxImage() {
    if (!currentGalleryImages.length) return;

    currentLightboxIndex =
      (currentLightboxIndex + 1) % currentGalleryImages.length;

    updateLightboxImage();
  }

  function showPrevLightboxImage() {
    if (!currentGalleryImages.length) return;

    currentLightboxIndex =
      (currentLightboxIndex - 1 + currentGalleryImages.length) %
      currentGalleryImages.length;

    updateLightboxImage();
  }

  galleries.forEach((gallery) => {
    const images = Array.from(gallery.querySelectorAll(".gallery-image"));
    const next = gallery.querySelector(".next");
    const prev = gallery.querySelector(".prev");

    if (!images.length) return;

    let index = images.findIndex((img) => img.classList.contains("active"));
    if (index < 0) index = 0;

    function show(i) {
      images.forEach((img) => img.classList.remove("active"));
      images[i].classList.add("active");
      index = i;
    }

    next?.addEventListener("click", (e) => {
      e.stopPropagation();
      const newIndex = (index + 1) % images.length;
      show(newIndex);
    });

    prev?.addEventListener("click", (e) => {
      e.stopPropagation();
      const newIndex = (index - 1 + images.length) % images.length;
      show(newIndex);
    });

    images.forEach((img) => {
      img.addEventListener("click", () => {
        const activeIndex = images.findIndex((image) =>
          image.classList.contains("active")
        );

        openLightbox(images, activeIndex >= 0 ? activeIndex : 0);
      });
    });

    show(index);
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxNext?.addEventListener("click", showNextLightboxImage);
  lightboxPrev?.addEventListener("click", showPrevLightboxImage);

  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox?.classList.contains("active")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showNextLightboxImage();
    if (e.key === "ArrowLeft") showPrevLightboxImage();
  });
})();

// ============================
// Tabs de servicios (servicios.html)
// ============================
(function () {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const tabsSelect = document.querySelector(".tabs-select");

  if (!tabBtns.length) return;

  function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === tabName));
    tabBtns.forEach(btn => btn.setAttribute("aria-selected", btn.dataset.tab === tabName));
    tabPanels.forEach(panel => panel.classList.toggle("is-active", panel.id === "tab-" + tabName));
    if (tabsSelect) tabsSelect.value = tabName;
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  if (tabsSelect) {
    tabsSelect.addEventListener("change", () => switchTab(tabsSelect.value));
  }
})();

// ============================
// Filtro de proyectos (proyectos.html)
// ============================
(function () {
  const filtros = document.querySelectorAll(".filtro-btn");
  const cards = document.querySelectorAll(".proj-card");

  if (!filtros.length) return;

  filtros.forEach(btn => {
    btn.addEventListener("click", () => {
      filtros.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const filter = btn.dataset.filter;
      cards.forEach(card => {
        card.style.display = (filter === "todos" || card.dataset.tipo === filter) ? "" : "none";
      });
    });
  });
})();

// ============================
// Modal de detalle de proyecto (proyectos.html)
// ============================
(function () {
  const projModal = document.getElementById("proj-modal");
  const projBackdrop = document.getElementById("proj-modal-backdrop");
  const projClose = document.getElementById("proj-modal-close");
  const projImg = document.getElementById("proj-modal-img");
  const projBadge = document.getElementById("proj-modal-badge");
  const projTitle = document.getElementById("proj-modal-title");
  const projLocation = document.getElementById("proj-modal-location");
  const projDesc = document.getElementById("proj-modal-desc");

  if (!projModal) return;

  function openProjModal(data) {
    projImg.src = data.img;
    projImg.alt = data.title;
    projBadge.textContent = data.badge;
    projBadge.className = "proj-modal-badge " + data.tipo;
    projTitle.textContent = data.title;
    projLocation.textContent = "📍 " + data.location;
    projDesc.textContent = data.desc;
    projModal.classList.add("is-open");
    projModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeProjModal() {
    projModal.classList.remove("is-open");
    projModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  document.querySelectorAll(".proj-card-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".proj-card");
      openProjModal({
        img: card.dataset.img,
        title: card.dataset.title,
        badge: card.dataset.badge,
        tipo: card.dataset.tipo,
        location: card.dataset.location,
        desc: card.dataset.desc
      });
    });
  });

  projBackdrop?.addEventListener("click", closeProjModal);
  projClose?.addEventListener("click", closeProjModal);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && projModal?.classList.contains("is-open")) closeProjModal();
  });
})();

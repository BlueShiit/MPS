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
}

function cerrarCotizacion() {
  if (!quoteModal) return;
  quoteModal.classList.remove("is-open");
  quoteModal.setAttribute("aria-hidden", "true");
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

quoteBackdrop?.addEventListener("click", cerrarCotizacion);
quoteClose?.addEventListener("click", cerrarCotizacion);
quoteCancelar?.addEventListener("click", cerrarCotizacion);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && quoteModal?.classList.contains("is-open")) {
    cerrarCotizacion();
  }
});

tipoAndamioSel?.addEventListener("change", actualizarCampos);

// SUBMIT cotización -> Supabase (tabla cotizaciones)
quoteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

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
  const correo    = document.getElementById("correo")?.value.trim();

  // 2) Validar correo (más estricto que el input type=email)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!emailRegex.test(correo)) {
    alert("❌ Ingresa un correo válido (ej: nombre@empresa.cl)");
    return;
  }

  // 3) Validar teléfono Chile (+56 9 XXXXXXXX o 9XXXXXXXX)
  let telefono = telefonoRaw.replace(/[^\d+]/g, "");

  // Normaliza: si viene 9XXXXXXXX => lo pasa a 56 9XXXXXXXX
  if (/^9\d{8}$/.test(telefono)) {
    telefono = "56" + telefono;
  }

  // Normaliza: si viene +56XXXXXXXXX => quita el +
  if (/^\+56\d{9}$/.test(telefono)) {
    telefono = telefono.slice(1);
  }

  // Debe quedar como: 569XXXXXXXX
  const phoneRegex = /^56(?:9\d{8})$/;
  if (!phoneRegex.test(telefono)) {
    alert("❌ Ingresa un teléfono válido de Chile (ej: +56 9 1234 5678)");
    return;
  }

  // 4) Guardar en Supabase (tabla quotes/cotizaciones)
  const res = await sendQuoteToSupabase({
    tipo_andamio,
    m2_blitz,
    kg_allround,
    ciudad,
    direccion,
    empresa,
    telefono, // guardamos normalizado
    correo,
    created_at: new Date().toISOString(),
  });

  if (!res.ok) {
    console.error("Supabase cotizaciones:", res.error);
    alert("❌ No se pudo enviar la cotización. Revisa la consola (F12).");
    return;
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
    }),
  });
} catch (e) {
  console.warn("No se pudo enviar correo automático:", e);
}

  // 6) UI
  alert("✅ Cotización enviada. Quedó registrada en la base de datos.");
  quoteForm.reset();
  actualizarCampos();
  cerrarCotizacion();
});

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

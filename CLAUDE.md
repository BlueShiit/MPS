# CLAUDE.md — MPS Montajes Profesionales & Soluciones

## Idioma

Responde siempre en **español**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 personalizado, JavaScript vanilla (ES2020+) |
| Tipografía | Google Fonts — Inter (400, 600, 800) |
| Base de datos | Supabase (PostgreSQL) vía SDK JS (`@supabase/supabase-js@2`, CDN) |
| Hosting / Deploy | Netlify (sitio estático + Netlify Forms) |
| Funciones serverless | Netlify Functions (Node.js CommonJS) |
| Envío de correo | Nodemailer via SMTP (variables de entorno en Netlify) |
| Control de versiones | Git — repositorio en GitHub (`BlueShiit/MPS`) |

### Variables de entorno (Netlify)
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`

### Credenciales conocidas
- Email de contacto: `arturoperezm2015@gmail.com`
- WhatsApp: `+56 9 5413 8616`
- Supabase URL: `https://orwnsptmtraujxmeqwph.supabase.co`
- Ubicación: Puente Alto, Región Metropolitana, Chile

---

## Estructura de carpetas

```
MPS/
├── assets/
│   └── img/              # hero1.jpg, hero2.jpg, hero3.jpg, logo-mps-navbar.svg,
│                         # montaje.jpg, servicios.jpg, supervision.jpg
├── css/
│   └── style.css         # Todos los estilos del sitio (único archivo CSS)
├── js/
│   └── main.js           # Toda la lógica frontend
├── netlify/
│   └── functions/
│       └── send-mail.js  # Función serverless: emails con Nodemailer
├── index.html            # Página principal: hero slider, sección nosotros, cotización
├── nosotros.html         # Página "Conócenos" con 6 secciones detalladas
├── servicios.html        # Dos servicios: montaje/desmontaje y supervisión
├── proyectos.html        # Galería de proyectos con lightbox
├── package.json          # Dependencias: nodemailer
└── CLAUDE.md             # Este archivo
```

---

## Páginas y navbar

Todas las páginas comparten el mismo navbar con estos 4 enlaces:
- **Inicio** → `index.html` (ancla `#inicio` desde index)
- **Conócenos** → `nosotros.html` ← fue renombrado de "Nosotros" para evitar confusión con la sección `#nosotros` del index
- **Servicios** → `servicios.html`
- **Proyectos** → `proyectos.html`

---

## Funcionalidades implementadas

### Hero / Slider (`index.html`)
- 3 slides con: pill + título + botón CTA
- Altura: `calc(100vh - 70px)` para llenar la pantalla menos el navbar
- Slide 1 → abre modal de cotización
- Slide 2 → `nosotros.html`
- Slide 3 → `servicios.html`
- Autoplay 6s, controles prev/next centrados con flexbox, dots, swipe táctil, pausa en hover

### Página Conócenos (`nosotros.html`)
6 secciones, cada una con un botón `detail-link`:
- **Por qué elegir MPS** → `servicios.html`
- **HSE y documentación** → PDF (pendiente, botón deshabilitado con clase `detail-link--soon`)
- **Seguridad** → `index.html?cotizar=1`
- **Misión** → sin botón
- **Experiencia** → `proyectos.html`
- **Soluciones integrales** → `servicios.html`

### Modal de cotización
- Se abre con `id="btn-cotizacion"` o navegando a `?cotizar=1` en la URL
- El parámetro `?cotizar=1` es detectado en `main.js` y abre el modal automáticamente
- El mismo modal existe en `index.html` y `servicios.html` (idénticos)
- Formulario con Netlify Forms (`name="cotizacion"`, `data-netlify="true"`, honeypot)
- Doble envío: Supabase (tabla `cotizaciones`) + Netlify Forms + email via `send-mail`

### Formulario de cotización — campos y validaciones
| Campo | Validación / Ayuda |
|---|---|
| Tipo de andamio | Select: Blitz (m²) o Allround (kg) |
| M² / KG | Rango: 20–5.000 m² / 500–50.000 kg, validación inline |
| Ciudad | Autocomplete custom (dropdown propio, no datalist nativo) con ~60 ciudades chilenas |
| Dirección | Autocomplete con Nominatim API (OpenStreetMap, sin API key, solo Chile). Al seleccionar auto-rellena Ciudad |
| Empresa | Validación en blur, mínimo 2 caracteres |
| Teléfono | Selector de prefijo país (Chile +56 por defecto, 13 países disponibles). Placeholder cambia por país. Validación: Chile = `9XXXXXXXX`; otros = 7–12 dígitos |
| Correo | Validación regex en tiempo real |

**Botones del formulario**: Cancelar (blanco con borde azul) y Enviar cotización (azul), mismo tamaño con `flex: 1`.

### CSS — clases de validación inline
- `.field--valid` → borde verde en input
- `.field--invalid` → borde rojo en input + `.field-hint--error` con mensaje
- `.ac-list` / `.ac-item` → dropdown de autocomplete custom (mismo estilo en ciudad y dirección)
- `.phone-wrap` → contenedor unificado selector prefijo + input teléfono
- `.phone-prefix` → select del prefijo con `color-scheme: light` para evitar problemas de color

### Footer (todas las páginas)
3 columnas + barra inferior:
- **Col 1**: Logo, descripción, sección "Contacto" (email + WhatsApp), sección "Ubicación" (Puente Alto, RM)
- **Col 2**: Navegación (4 páginas)
- **Col 3**: Servicios (montaje, supervisión, HSE, cotización rápida)
- **Síguenos**: fila entre columnas y copyright con íconos SVG de Instagram, X y Facebook (hrefs pendientes de redes reales)
- **Copyright**: `© [año dinámico] MPS — Montajes Profesionales & Soluciones`

### Otras funcionalidades (`main.js`)
- **Scroll reveal** con `IntersectionObserver` (clase `.reveal`)
- **Widget de contacto flotante** (panel lateral con form → Supabase tabla `contactos`)
- **Galería de proyectos** con slider por tarjeta y lightbox con teclado
- **Año dinámico** en footer via `id="year"`
- **`initFormHelpers()`** — función que inicializa todos los helpers del formulario

---

## Decisiones y contexto importante

- El navbar tenía "Nosotros" apuntando a `#nosotros` (ancla interna) en `servicios.html` y `proyectos.html`, causando redirección errónea. Se renombró a **"Conócenos"** y se corrigieron todos los hrefs.
- El datalist nativo HTML para ciudad fue reemplazado por un dropdown custom porque el navegador (macOS) cambiaba el esquema de color al filtrar, haciendo el texto invisible.
- `color-scheme: light` aplicado a `.field input` para forzar modo claro en controles nativos.
- El hero usa `calc(100vh - 70px)` (70px = navbar: logo 46px + padding 24px).
- En mobile el footer colapsa a 1 columna (`@media max-width: 640px`).
- `nosotros.html` es un archivo nuevo (no existía antes, el contenido "Nosotros" estaba solo como sección dentro de `index.html`).

---

## Estado del proyecto (último commit)

**Commit:** `160c772` — *Rediseño UI: navbar, hero, footer, formulario y página Conócenos*
**Branch:** `main` — sincronizado con GitHub (`BlueShiit/MPS`) y desplegado en Netlify.

### Pendiente / Por hacer
- Reemplazar `href="#"` en íconos de redes sociales con URLs reales
- Subir el PDF de documentación HSE y actualizar el botón en `nosotros.html` (quitar `detail-link--soon`, cambiar `href="#"` por la ruta del PDF)
- Verificar número de WhatsApp en `servicios.html` (actualmente tiene `56912345678` placeholder en el widget de contacto)

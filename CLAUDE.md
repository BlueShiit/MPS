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

### Credenciales e IDs conocidos
- Email de contacto: `arturoperezm2015@gmail.com`
- WhatsApp: `+56 9 5413 8616`
- Supabase URL: `https://orwnsptmtraujxmeqwph.supabase.co`
- Supabase Project Ref: `orwnsptmtraujxmeqwph`
- Netlify Site ID: `ea0c7d65-90d5-4135-90eb-3d1c5b56a66f`
- Netlify URL: `https://mps-andamios.netlify.app`
- Ubicación: Puente Alto, Región Metropolitana, Chile

### Acceso a infraestructura desde Claude Code
- **Supabase Management API**: requiere Personal Access Token (PAT) de `supabase.com/dashboard/account/tokens`. Con él se puede ejecutar SQL via `POST https://api.supabase.com/v1/projects/{ref}/database/query`
- **Netlify API**: usa el mismo PAT de Supabase (funciona como bearer token para Netlify también)
- **psql / Supabase CLI**: no instalados en el equipo. Homebrew tampoco instalado.

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
- **Conócenos** → `nosotros.html` ← renombrado de "Nosotros" para evitar confusión con la sección `#nosotros` del index
- **Servicios** → `servicios.html`
- **Proyectos** → `proyectos.html`

---

## Funcionalidades implementadas

### Hero / Slider (`index.html`)
- 3 slides: pill + título + botón CTA
- Altura: `calc(100vh - 70px)` (70px = logo 46px + padding 24px del navbar)
- Slide 1 → abre modal de cotización (`id="btn-cotizacion"`)
- Slide 2 → `nosotros.html`
- Slide 3 → `servicios.html`
- Autoplay 6s, controles prev/next centrados con flexbox, dots, swipe táctil, pausa en hover

### Página Conócenos (`nosotros.html`)
6 secciones con botones `detail-link`:
- **Por qué elegir MPS** → `servicios.html`
- **HSE y documentación** → PDF pendiente, botón con clase `detail-link--soon` (deshabilitado)
- **Seguridad** → `index.html?cotizar=1`
- **Misión** → sin botón
- **Experiencia** → `proyectos.html`
- **Soluciones integrales** → `servicios.html`

### Modal de cotización
- Se abre con botón `id="btn-cotizacion"` o con URL `?cotizar=1` (detectado en `main.js` al cargar)
- Mismo modal en `index.html` y `servicios.html` (HTML idéntico)
- `position: fixed`, scroll interno propio (`overflow-y: auto`)
- `body.modal-open { overflow: hidden }` bloquea scroll del fondo mientras está abierto
- Netlify Forms: `name="cotizacion"`, `data-netlify="true"`, honeypot `bot-field`
- Flujo de envío: Supabase → Netlify Forms → `send-mail` (admin + cliente)

### Formulario de cotización — campos y validaciones (`initFormHelpers()`)
| Campo | Comportamiento |
|---|---|
| Tipo de andamio | Select Blitz/Allround. Muestra/oculta campo m² o kg según selección |
| M² / KG | Rango: 20–5.000 m² / 500–50.000 kg. Validación inline + activa caja de precio |
| Ciudad | Autocomplete custom con ~60 ciudades/comunas chilenas. Se auto-rellena al seleccionar dirección |
| Dirección | Autocomplete Nominatim (OpenStreetMap, sin API key, `countrycodes=cl`). Al seleccionar rellena Ciudad |
| Empresa | Validación en blur, mín. 2 caracteres |
| Teléfono | `phone-wrap`: selector prefijo + input. Chile +56 por defecto (13 países). Placeholder y validación cambian por país. Chile: `9XXXXXXXX`; otros: 7–12 dígitos |
| Correo | Validación regex en tiempo real |

### Algoritmo de cotización (`PRICING` en `main.js`)
Precios por tramo de volumen, neto + IVA 19%:

**Blitz (m²):** $4.200 → $3.600 → $3.000 → $2.500  
**Allround (kg):** $380 → $320 → $260 → $200

- `calcularPrecio(tipo, cantidad)` → devuelve `{ cantidad, unidad, precioUnitario, neto, iva, total }`
- `formatCLP(n)` → formato `$1.500.000` con `toLocaleString("es-CL")`
- Caja verde `.precio-box` aparece en tiempo real dentro del formulario al ingresar m²/kg
- Precio incluido en payload de Supabase y en el email al cliente/admin

### Supabase — tabla `cotizaciones`
Columnas existentes:
`id`, `created_at`, `tipo_andamio`, `m2_blitz`, `kg_allround`, `ciudad`, `direccion`, `empresa`, `telefono`, `correo`, `precio_unitario`, `precio_neto`, `precio_iva`, `precio_total`

Lógica de envío: intenta insertar con columnas de precio; si falla por columna inexistente, reintenta sin precio (fallback defensivo).

### Email automático (`netlify/functions/send-mail.js`)
- `emailClienteHTML()`: correo de confirmación al cliente con resumen + tabla de precio estimado
- `emailAdminHTML()`: notificación interna con todos los datos + precio
- `precioBlock(precio)`: genera la tabla de desglose CLP (reutilizada en ambos emails)
- Se dispara desde el submit del formulario via `fetch("/.netlify/functions/send-mail", ...)`

### CSS — clases relevantes
| Clase | Uso |
|---|---|
| `.field--valid` / `.field--invalid` | Borde verde/rojo en inputs |
| `.field-hint--error` / `--ok` | Mensaje de ayuda debajo del input |
| `.ac-list` / `.ac-item` | Dropdown autocomplete custom (ciudad y dirección) |
| `.phone-wrap` / `.phone-prefix` | Contenedor prefijo + input teléfono |
| `.precio-box` | Caja estimación de precio en el formulario |
| `.quote-modal` | Modal de cotización (`overflow-y: auto` para scroll interno) |
| `body.modal-open` | Bloquea scroll del fondo cuando el modal está abierto |
| `.detail-link--soon` | Botón deshabilitado con texto "(próximamente)" |
| `.footer-grid` | Grid de 3 columnas del footer (colapsa a 1 en mobile ≤640px) |
| `.footer-social` | Fila de íconos SVG de redes sociales |

### Footer (todas las páginas)
- **Col 1**: Logo + descripción + "Contacto" (email, WhatsApp) + "Ubicación" (Puente Alto, RM)
- **Col 2**: Navegación
- **Col 3**: Servicios + link cotización rápida
- **Síguenos**: íconos SVG de Instagram, X y Facebook (hrefs en `#`, pendientes)
- **Copyright**: año dinámico via `id="year"`

### Otras funcionalidades (`main.js`)
- **Auto-open modal**: detecta `?cotizar=1` en URL al cargar → abre modal y limpia la URL con `history.replaceState`
- **Scroll reveal**: `IntersectionObserver` sobre elementos `.reveal`
- **Widget de contacto flotante**: panel lateral → Supabase tabla `contactos`
- **Galería de proyectos**: slider por tarjeta + lightbox con navegación por teclado

---

## Decisiones técnicas importantes

- Navbar renombrado "Nosotros" → "Conócenos" porque `servicios.html` y `proyectos.html` apuntaban a `index.html#nosotros` (ancla interna), causando navegación errónea.
- Datalist nativo reemplazado por autocomplete custom para ciudad: macOS cambiaba el esquema de color al filtrar dejando el texto invisible.
- `color-scheme: light` en `.field input` para forzar modo claro en controles nativos del navegador.
- `.quote-backdrop` usa `position: fixed` (no `absolute`) para no desplazarse al hacer scroll dentro del modal.
- Supabase fallback: si las columnas de precio no existen, el insert se reintenta sin ellas para no bloquear el formulario.

---

## Estado del proyecto

**Último commit:** `c8b0e75` — *Arregla scroll del modal de cotización*  
**Tag de respaldo:** `v1.1-respaldo-20260531`  
**Branch:** `main` — sincronizado con GitHub y desplegado en Netlify (`ready`)

### Pendiente / Por hacer
- Reemplazar `href="#"` en íconos de redes sociales (Instagram, X, Facebook) con URLs reales
- Subir PDF de documentación HSE → actualizar botón en `nosotros.html#hse-documentacion` (quitar `detail-link--soon`, cambiar `href="#"` por ruta del PDF)
- Verificar número de WhatsApp en widget de contacto de `servicios.html` (actualmente tiene placeholder `56912345678`)

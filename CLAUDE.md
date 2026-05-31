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
| Envío de correo | Nodemailer via SMTP (configurado con variables de entorno en Netlify) |
| Control de versiones | Git — repositorio en GitHub (`BlueShiit/MPS`) |

### Variables de entorno (Netlify)
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`

---

## Estructura de carpetas

```
MPS/
├── assets/
│   └── img/              # Imágenes del sitio (hero, servicios, logo SVG)
├── css/
│   └── style.css         # Estilos globales del sitio
├── js/
│   └── main.js           # Lógica frontend: carrusel, Supabase, modales, formularios
├── netlify/
│   └── functions/
│       └── send-mail.js  # Función serverless: envío de emails con Nodemailer
├── index.html            # Página principal (inicio, nosotros, cotización)
├── servicios.html        # Página de servicios
├── proyectos.html        # Galería de proyectos con lightbox
├── nosotros.html         # Página sobre la empresa
├── package.json          # Dependencias Node.js (nodemailer)
└── CLAUDE.md             # Este archivo
```

---

## Funcionalidades principales

- **Carrusel hero** con autoplay, controles táctiles/teclado y dots de navegación
- **Modal de cotización** con validación de teléfono chileno (+56) y correo
- **Widget de contacto flotante** (panel lateral)
- **Integración doble**: Supabase guarda los datos; Netlify Forms registra el envío
- **Email automático**: al enviar cotización se dispara `send-mail` → correo al admin + confirmación al cliente
- **Galería de proyectos** con slider por proyecto y lightbox
- **Scroll reveal** con `IntersectionObserver`

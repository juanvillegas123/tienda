# Plan de trabajo — F3.4: Inicio por capítulos, efectos "papel y tinta" y SEO básico

> **Estado:** Pendiente de aprobación. No se ha modificado código todavía.
> **Restricciones verificadas:** solo frontend (`web/`) y archivos estáticos públicos (`web/public/`, `web/scripts/`). No se modifica `api/`, `api/src/db/schema.ts`, `features/admin/`, ni la lógica interna de `carrito.service.ts` o `catalogo.service.ts`. Sin librerías nuevas. Sin figura central en el hero (estructura preparada a 2 zonas con posibilidad de 3.ª zona en el futuro).

---

## 1. Archivos a crear o modificar por etapa

### Etapa A: Rutas y SEO base
Commit previsto: `feat: F3.4-A rutas y SEO básico`

**Archivos nuevos:**
- `web/src/app/shared/negocio.config.ts` — fuente centralizada de datos del negocio (nombre, lema, dirección, referencia, horario estructurado para `America/La_Paz`, Google Maps, redes sociales, WhatsApp de respaldo, preguntas frecuentes y URL base por defecto).
- `web/src/app/core/seo.service.ts` — gestión de `Title`, `Meta` (`description`, `robots`, Open Graph, Twitter Card), `<link rel="canonical">` y datos estructurados JSON-LD (`Store`, `FAQPage`, `Product`, `BreadcrumbList`) con escape seguro de `<`.
- `web/public/robots.txt` — permite indexación pública, bloquea `/admin` y `/carrito`, y referencia `sitemap.xml`.
- `web/public/sitemap.xml` — mapa inicial con rutas fijas (`/`, `/catalogo`) y categorías base.
- `web/scripts/generar-sitemap.mjs` — script Node (sin dependencias externas, usando `fetch` nativo) invocable con `npm run sitemap` que consulta `GET /categorias` y `GET /productos` usando la URL de API y `siteUrl` configurables y regenera `web/public/sitemap.xml` y actualiza la URL del sitemap en `robots.txt` si aplica.

**Archivos modificados:**
- `web/src/environments/environment.ts` y `web/src/environments/environment.prod.ts` — agregar `siteUrl` (ej. `http://localhost:4200` en desarrollo y dominio configurable en producción).
- `web/package.json` — agregar únicamente el script `"sitemap": "node scripts/generar-sitemap.mjs"` (sin añadir dependencias).
- `web/src/index.html` — cambiar `lang="es"`, agregar `<meta name="description">`, metadatos Open Graph y Twitter Card por defecto con `img/logo-512.png`, manteniendo `favicon.ico`, `apple-touch-icon.png` y `theme-color` `#0c1014`.
- `web/src/app/app.config.ts` — habilitar `withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })` en `provideRouter(routes, ...)` para que `/#cap-2` y el regreso atrás funcionen correctamente.
- `web/src/app/app.routes.ts` — reestructurar rutas finales (sección 2), agregar `data.seo` por ruta (incluyendo `noindex, nofollow` en `/carrito`, `/admin/**` y `**` 404), eliminar el antiguo `redirectTo: ''` de `/catalogo` y redirigir `/tienda` a `/#cap-2`.
- `web/src/app/core/configuracion.service.ts` — reutilizar `NEGOCIO_CONFIG` como valores por defecto/respaldo manteniendo compatibilidad con `GET /configuracion/tienda` y `GET /configuracion/whatsapp`.
- `web/src/app/features/publico/catalogo/catalogo.ts` y `catalogo.html` — adaptar para `/catalogo` y `/catalogo/:categoria`:
  - Leer `:categoria` (slug) desde `paramMap`, resolver su `id` usando `generarSlug` sobre las categorías cargadas.
  - Mantener compatibilidad con `?categoria=ID` (redirigiendo con `replaceUrl: true` a `/catalogo/{slug}` y conservando `?q=`).
  - Cambiar los chips de categoría a enlaces `<a [routerLink]="...">` para rastreabilidad SEO.
  - Actualizar `SeoService` (título, descripción, canónica, `BreadcrumbList`) y mostrar un párrafo breve introductorio cuando se filtra por categoría.
  - Retirar el hero del catálogo (ahora vive en `/`) dejando un único `<h1>` claro en `/catalogo` y `/catalogo/:categoria`.
- `web/src/app/features/publico/producto-detalle/producto-detalle.ts` y `producto-detalle.html` — inyectar `SeoService` para título dinámico `"{Nombre} – Bs. {precio} | Onii-Chan Store"`, descripción, `og:image`, `Product` JSON-LD (`BOB`, `InStock`/`OutOfStock`), `BreadcrumbList` JSON-LD, `noindex` en 404, y asegurar `alt` descriptivo (`"Figura/Producto {nombre}..."`), `width`/`height` y un solo `<h1>`.
- `web/src/app/features/publico/carrito/carrito.ts` y `web/src/app/features/publico/no-encontrado/no-encontrado.ts` — aplicar `noindex, nofollow` vía `SeoService` (respaldo adicional al `data.seo` de ruta).
- `web/src/app/features/publico/layout/public-layout.html` — actualizar enlaces del encabezado: **Catálogo** (`/catalogo`), **La Tienda** (`/` con `fragment="cap-2"`), **Carrito** (`/carrito`); mantener footer resumido sin cambios de contenido ni enlaces de administración.

---

### Etapa B: Inicio por capítulos (sin efectos de scroll)
Commit previsto: `feat: F3.4-B inicio por capítulos`

**Archivos nuevos:**
- `web/src/app/features/publico/inicio/inicio.ts` y `inicio.html` — nueva página de inicio (`/`) estructurada en 4 bloques:
  - **0. Hero:** kicker `"Tienda física & online · Sucre, Bolivia"`, único `<h1>` `"CALIDAD EN FIGURAS"`, frase corta, botones *"Explorar catálogo"* (`/catalogo`) y *"Consultar por WhatsApp"*, y logo circular `img/logo-192.png` a la derecha (sin `loading="lazy"`, con `width="192" height="192"`). Layout con 2 zonas preparado para una futura 3.ª zona central.
  - **CAP. 01 ✦ CATÁLOGO:** tira horizontal *"Recién llegados"* (últimos productos de la lista cargada) y una tira horizontal por cada categoría activa con 6 a 8 productos (`scroll-snap`), omitiendo categorías sin productos activos, con botón/enlace `"Ver todas las {categoría}"` hacia `/catalogo/{slug}`.
  - **CAP. 02 ✦ CÓMO COMPRAR Y UBICACIÓN (`id="cap-2"` con `scroll-margin-top`):** 3 viñetas con pasos de compra (Arma tu vitrina, Envía por WhatsApp, Paga y recibe) + viñeta única de ubicación y horario con estado **"Abierto ahora" / "Cerrado ahora"** calculado con `Intl.DateTimeFormat` en `timeZone: 'America/La_Paz'`, botón *"Copiar dirección"* y enlace *"Abrir en Google Maps"*.
  - **CAP. 03 ✦ REDES Y PREGUNTAS FRECUENTES:** viñetas de Instagram, TikTok, Facebook y WhatsApp + acordeón accesible de preguntas frecuentes (`<button>` con `aria-expanded`, `aria-controls`, navegable con Enter/Espacio).
  - Inyección de `SeoService` (título, descripción, canónica y JSON-LD `Store` + `FAQPage`).
- `web/src/app/shared/ui/franja-capitulo/franja-capitulo.ts` — componente standalone `FranjaCapituloComponent` (versión estática en Etapa B; recibe número/título como `"CAP. 01 ✦ CATÁLOGO"` y dirección de inclinación alterna).

**Archivos modificados:**
- `web/src/app/app.routes.ts` — apuntar `/` a `InicioComponent`.
- `web/src/styles.css` — estilos base de capítulos, `scroll-margin-top` para anclas bajo encabezado fijo (`scroll-mt-20`), `scroll-snap` de tiras horizontales y estructura base de franjas.

*(Nota sobre `features/publico/tienda/`):* el archivo viejo deja de ser ruta activa porque `/tienda` redirige a `/#cap-2`; se puede eliminar en Etapa B o mantener archivado hasta QA. Se propone eliminarlo en Etapa B para evitar código muerto, ya que todo su contenido pasa a los capítulos 2 y 3 del inicio.

---

### Etapa C: Efectos "papel y tinta"
Commit previsto: `feat: F3.4-C efectos de scroll papel y tinta`

**Archivos nuevos:**
- `web/src/app/shared/directivas/progreso-scroll.directive.ts` — directiva `appProgresoScroll`:
  - Registra listeners de scroll fuera de Angular (`NgZone.runOutsideAngular`) con `{ passive: true }`, coordinados en un único bucle `requestAnimationFrame`.
  - Usa `IntersectionObserver` para actualizar solo los elementos visibles en pantalla.
  - Fase de lectura primero (`getBoundingClientRect`), fase de escritura después (`style.setProperty`), evitando layout thrashing.
  - Escribe `--p` (0 a 1) en capítulos, `--a` (8 px a 54 px en escritorio; rango reducido en móvil) en franjas diagonales, y `--d` (0 a 1) en pinceladas SVG.
  - Respeta `prefers-reduced-motion: reduce` (fija `--p: 0.5`, `--d: 1` e inclinación fija sin suscribirse al scroll).
- `web/src/app/shared/directivas/vineta.directive.ts` — directiva `appVineta`:
  - `IntersectionObserver` de una sola activación (`unobserve` tras entrar) que agrega la clase `.in` con retardo escalonado `--i` (sin retardos largos en móvil).
  - Se aplica únicamente a paneles de capítulos (pasos, ubicación, redes, preguntas), **nunca** a tarjetas de producto.
  - Con `prefers-reduced-motion`, aplica `.in` inmediatamente sin transición.

**Archivos modificados:**
- `web/src/styles.css` —
  - Capas `::before` de trama por capítulo (`opacity: 0.17`, `pointer-events: none`, máscara vertical desvanecida): puntos (hero y CAP. 01), líneas diagonales (CAP. 02) y anillos (CAP. 03).
  - Estilos de `clip-path` diagonal en `FranjaCapituloComponent` alternando inclinación.
  - Estilos de pincelada SVG (`stroke-dasharray: 1 1; stroke-dashoffset: calc(1 - var(--d))`).
  - Animación de entrada de viñetas (`clip-path: polygon(...)`, `0.7s`) y aparecer suave (`opacity` + `translateY(12px)`) para tarjetas de producto.
  - Media query `@media (prefers-reduced-motion: reduce)` completa y ajustes ligeros para móvil (`< 640px`).
- `web/src/app/shared/ui/franja-capitulo/franja-capitulo.ts` — conectar `appProgresoScroll` (`--a`) y pincelada SVG (`pathLength="1"`, `--d`).
- `web/src/app/features/publico/inicio/inicio.ts` y `inicio.html` — aplicar `appProgresoScroll` a hero y capítulos 1–3, `appVineta` con `--i` a los paneles de contenido, y agregar la **barra de progreso vino** fina bajo el encabezado con `transform: scaleX()` (actualizada fuera de Angular).

---

### Etapa D: QA y pulido final
Commit previsto: `chore: F3.4-D ajustes de QA`

**Archivos a ajustar (según hallazgos de QA):**
- Ajustes puntuales de responsividad, contraste, foco visible, `width`/`height` de imágenes y métricas de Lighthouse en `inicio.html`, `catalogo.html`, `producto-detalle.html`, `public-layout.html` y `styles.css`.
- Verificación final de `ng build`, revisión de consola sin errores y ejecución de `npm run sitemap`.

---

## 2. Rutas finales y piezas nuevas

### Tabla de rutas públicas
| Ruta | Componente / Acción | Indexación SEO |
|---|---|---|
| `/` | `InicioComponent` (inicio por capítulos) | `index, follow` |
| `/catalogo` | `CatalogoComponent` (catálogo completo + búsqueda/filtros) | `index, follow` |
| `/catalogo/:categoria` | `CatalogoComponent` filtrado por slug de categoría | `index, follow` |
| `/producto/:ruta` | `ProductoDetalleComponent` (slug canónico + JSON-LD `Product`) | `index, follow` (404 → `noindex`) |
| `/tienda` | Redirección con `UrlTree` a `/#cap-2` | Redirección |
| `/carrito` | `CarritoComponent` | `noindex, nofollow` |
| `/admin/**` | Panel de administración (sin cambios) | `noindex, nofollow` |
| `**` | `NoEncontradoComponent` (404 amigable) | `noindex, nofollow` |

### Componentes, directivas y servicios nuevos
| Pieza | Tipo | Responsabilidad |
|---|---|---|
| `negocio.config.ts` | Configuración (`shared/`) | Centralizar datos reales de Onii-Chan Store, horario estructurado (`America/La_Paz`), redes y FAQ. |
| `SeoService` | Servicio (`core/`) | Actualizar `Title`, `Meta`, `<link rel="canonical">`, `robots` y scripts `<script type="application/ld+json">` sin fugas entre rutas. |
| `InicioComponent` | Componente (`features/publico/inicio/`) | Renderizar Hero + Capítulos 01, 02 y 03 consumiendo `CatalogoService`, `CarritoService` y `ConfiguracionService`. |
| `FranjaCapituloComponent` | Componente UI (`shared/ui/franja-capitulo/`) | Separador diagonal negro con título en `font-display`, inclinación alterna y pincelada vino bajo el título. |
| `ProgresoScrollDirective` (`appProgresoScroll`) | Directiva (`shared/directivas/`) | Calcular `--p`, `--a`, `--d` y barra de progreso fuera de `NgZone` con `rAF` + `IntersectionObserver`. |
| `VinetaDirective` (`appVineta`) | Directiva (`shared/directivas/`) | Revelar paneles con corte diagonal (`.in` + `--i`) una sola vez al entrar en viewport. |

---

## 3. Riesgos, dudas y puntos a confirmar

1. **Textos que implican promesas (para confirmar con la propietaria):**
   - Actualmente el código dice: `"Domingos cerrado · Pedidos online disponibles 24/7"`. Lo mantendremos tal como está y te avisamos aquí para confirmar si la propietaria desea conservar esa promesa de 24/7.
   - En la dirección aparece la referencia `"Zona céntrica — Sucre"`. Confirmar si es correcta o si prefiere otra referencia (o dejarla vacía).
2. **URL base de producción (`siteUrl`) y WhatsApp de respaldo:**
   - En `environment.prod.ts` aún no existe `siteUrl` (usaremos un valor configurable como `https://oniichanstore.bo` hasta que nos indiques el dominio final de Cloudflare) y `whatsappNumero` sigue con el placeholder `'59170000000'` (aunque en tiempo de ejecución `ConfiguracionService` lee el número real desde la API).
3. **Convivencia con `/admin/perfil → Información de la tienda`:**
   - En la fase anterior se creó `GET /configuracion/tienda` para editar dirección/redes desde el panel admin. En F3.4 `negocio.config.ts` será la configuración centralizada del frontend y servirá como fuente inicial/respaldo para `ConfiguracionService`, sin tocar `api/` ni `features/admin/`.
4. **Limitación conocida de SPA sin SSR ni prerender (sección 4.6):**
   - Al ser una aplicación Angular solo cliente (sin SSR), los rastreadores de **WhatsApp y Facebook** que no ejecutan JavaScript mostrarán al compartir un enlace de producto los metadatos por defecto de `index.html` (título general, lema *"Calidad en figuras"* y `img/logo-512.png`), y no la foto/precio específicos de ese producto. Googlebot sí renderiza JS y leerá los metadatos dinámicos y los JSON-LD.
5. **Script `lint` en `web/`:**
   - `web/package.json` actualmente no define un script `npm run lint` (solo `api/` tiene `oxlint`). Sin instalar librerías nuevas, validaremos el frontend con `npx ng build` y `npx tsc --noEmit` (y `npm run lint` en `api/` si corresponde). Si deseas otra comprobación, indícamelo.
6. **Eliminación del componente antiguo `features/publico/tienda/`:**
   - Al redirigir `/tienda` hacia `/#cap-2`, el componente `tienda.ts/.html` quedará sin ruta. En la Etapa B propongo eliminarlo para no dejar código muerto.

---

## 4. Lista de pruebas manuales por etapa

### Al terminar Etapa A (Rutas y SEO base)
- [ ] Verificar que `/catalogo` muestra el catálogo completo y `/catalogo/{slug}` filtra por esa categoría mostrando su párrafo introductorio.
- [ ] Abrir `/catalogo?categoria=1` (enlace antiguo F3.3) y confirmar que redirige limpiamente a `/catalogo/{slug}` manteniendo `?q=` si existe.
- [ ] Inspeccionar el `<head>` (DevTools → Elements) en `/`, `/catalogo`, `/catalogo/{slug}`, `/producto/{ruta}`, `/carrito` y una ruta inexistente (404): verificar `title`, `meta description`, `link[rel=canonical]`, `meta[name=robots]` (`noindex, nofollow` en carrito/admin/404) y scripts `application/ld+json`.
- [ ] Verificar `http://localhost:4200/robots.txt` y `http://localhost:4200/sitemap.xml`, y probar `npm run sitemap` con la API levantada.
- [ ] Comprobar que los chips de categoría son enlaces `<a>` navegables y que `/tienda` redirige a `/#cap-2`.

### Al terminar Etapa B (Inicio por capítulos sin efectos)
- [ ] Abrir `/` y confirmar el orden: Hero (2 zonas: texto + logo circular `logo-192.png`) → CAP. 01 (Recién llegados + tiras por categoría con productos activos) → CAP. 02 (3 pasos + ubicación/horario con estado *Abierto/Cerrado ahora* en hora de Bolivia) → CAP. 03 (redes + acordeón FAQ) → Footer.
- [ ] Confirmar que categorías sin productos activos no aparecen en CAP. 01 y que *"Ver todas las {categoría}"* navega a `/catalogo/{slug}`.
- [ ] Probar el enlace **La Tienda** del encabezado desde `/` y desde `/catalogo`: debe desplazarse suavemente hasta `#cap-2` sin que el header tape el título.
- [ ] Probar *"Copiar dirección"*, *"Abrir en Google Maps"*, los 4 enlaces de redes y el acordeón FAQ usando solo teclado (`Tab`, `Enter`, `Espacio`).
- [ ] Verificar que el botón de carrito y el agregado rápido en las tiras siguen respetando stock y sin mostrar stock exacto ni `"N/A"`.

### Al terminar Etapa C (Efectos papel y tinta)
- [ ] Hacer scroll lento y rápido en `/` comprobando: barra de progreso vino bajo el header, tramas distintas por capítulo (puntos, diagonales, anillos) cambiando suavemente, franjas diagonales variando inclinación alternada, pincelada vino dibujándose bajo cada título y viñetas revelándose con corte diagonal (mientras tarjetas de producto solo aparecen suavemente).
- [ ] Activar `prefers-reduced-motion: reduce` en DevTools (Rendering → Emulate CSS media feature) y confirmar que todo aparece estático, legible y completo al instante.
- [ ] Probar en celular (emulación 360px / 375px): efectos más ligeros y **cero scroll horizontal**.

### Al terminar Etapa D (QA)
- [ ] Revisar `/`, `/catalogo`, `/catalogo/{slug}`, `/producto/{ruta}` y `/carrito` en los anchos **320, 375, 414, 768, 1024, 1280, 1536 y 1920 px** + móvil en horizontal (landscape), confirmando ausencia total de desbordamiento horizontal.
- [ ] Ejecutar **Lighthouse** (SEO, Accesibilidad, Rendimiento) en `/`, `/catalogo` y un producto, y verificar corrección de observaciones evidentes.
- [ ] Validar el JSON-LD generado en la prueba de resultados enriquecidos de Google (o pegando el bloque renderizado).
- [ ] Confirmar que `ng build` finaliza sin errores y la consola del navegador queda limpia.

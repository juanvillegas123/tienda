# AGENTS.md: Sistema híbrido de tienda de merchandising

Instrucciones para agentes de IA y desarrolladores que trabajen en este repositorio. Ubicación: raíz de `tienda/`, junto a las carpetas `api/` (backend) y `web/` (frontend).

---

## 1. Contexto del proyecto

Sistema para una tienda real de merchandising (figuras, poleras, pines, peluches, accesorios) con dos canales de venta:

- **Online:** catálogo público. El cliente arma un carrito y envía el pedido por WhatsApp. La propietaria confirma la venta desde un panel.
- **Mostrador:** punto de venta (POS) para ventas presenciales, con control de caja.

Hay una sola usuaria con cuenta: la **administradora** (propietaria). Los clientes no tienen cuenta.

El proyecto es una práctica socioformativa universitaria basada en una tienda real. El código debe ser claro, mantenible y defendible ante un docente: se prefiere la solución simple y correcta sobre la sofisticada.

## 2. Reglas de trabajo para el agente

1. **Trabaja una fase a la vez** (sección 8). No adelantes funcionalidades de fases posteriores.
2. **Respeta el alcance.** No agregues funcionalidades que no estén en este documento. Si algo es ambiguo, pregunta antes de inventar.
3. **El esquema de la base de datos es la fuente de verdad:** `api/src/db/schema.ts`. No lo modifiques sin avisar explícitamente qué cambia y por qué.
4. **Nunca escribas secretos en el código ni en archivos versionados.** Las claves (`TURSO_AUTH_TOKEN`, `JWT_SECRET`) viven solo en `api/.env`, que debe estar en `.gitignore`.
5. **Antes de dar una fase por terminada:** el backend compila (`npm run build` en `api`), el frontend compila (`ng build` en `web`), no hay errores de lint y se cumple el criterio de terminado de la fase.
6. **Al terminar cada fase,** entrega un resumen corto: qué archivos creaste o cambiaste, qué rutas o pantallas existen ahora y qué falta probar manualmente.
7. **Idioma:** nombres de dominio (entidades, rutas, servicios, componentes) en español, coherentes con la base de datos (`productos`, `pedidos`, `cajas`). Textos de la interfaz, mensajes de error y comentarios en español. Palabras técnicas estándar (`guard`, `interceptor`, `service`) se mantienen en inglés.
8. **Commits:** un commit por unidad lógica, con mensaje convencional (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
9. **No uses `npm audit fix --force`** ni actualices versiones mayores de dependencias sin autorización.

## 3. Stack y estructura

| Capa | Tecnología |
|---|---|
| Backend (`api/`) | NestJS (módulos CommonJS) con adaptador Fastify, TypeScript |
| Base de datos | Turso (libSQL) con Drizzle ORM (`@libsql/client`) |
| Validación | Zod |
| Seguridad | Argon2id (contraseñas), JWT en cookie `httpOnly`, `@fastify/helmet`, `@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit` |
| Frontend (`web/`) | Angular (última versión estable instalada), componentes standalone, Signals, sin SSR |
| Estilos | Tailwind CSS v4 |
| Iconos | `lucide-angular` |
| Animaciones | GSAP (opcional, solo en la fase final de pulido) |

Estructura esperada del backend (`api/src/`):

```
auth/           login, logout, sesión, guard, decorador @Public()
categorias/
productos/
pedidos/
ventas/         ventas de mostrador
cajas/
devoluciones/
proveedores/
inventario/
reportes/
common/         filtros, pipes de validación Zod, utilidades de dinero
db/             schema.ts, db.ts (ya existen)
```

Estructura esperada del frontend (`web/src/app/`):

```
core/           servicios de API, auth, guards, interceptors, modelos
shared/         componentes reutilizables, pipes (moneda Bs.), utilidades
features/
  publico/      catálogo, detalle de producto, carrito
  admin/        login, pedidos, POS, caja, productos, categorías,
                inventario, proveedores, reportes
```

## 4. Reglas de negocio (invariantes: nunca se rompen)

- **RN-01 Stock:** ningún canal vende más unidades que el stock registrado. En mostrador se valida al cobrar. En pedidos online se valida al crear el pedido y se **vuelve a validar al confirmar**.
- **RN-02 Agotados:** los productos con stock 0 siguen visibles con la etiqueta "Agotado" y no se pueden agregar al carrito ni vender.
- **RN-03 Flujos de inventario:** el mostrador descuenta stock al cobrar. Los pedidos online lo descuentan **solo al confirmar**. Un pedido pendiente **no reserva stock**.
- **RN-04 Dinero:** todo el dinero se guarda como **enteros en centavos** (Bs. 45,50 = 4550) en columnas `*_centavos`. Se convierte a Bolivianos solo al mostrarlo. Prohibido usar números decimales para dinero.
- **RN-05 Tallas:** no existe stock por talla. `nota_talla` en productos es informativa y `nota_cliente` en `detalle_pedido` guarda la talla que pide el cliente. La talla la confirma la propietaria por WhatsApp.
- **RN-06 Caja:** no se registra una venta de mostrador sin caja abierta. Solo puede haber una caja abierta a la vez.
- **RN-07 Historial:** ventas y productos **no se borran**. Los productos se dan de baja (`activo = false`). Las ventas **no se anulan ni se modifican**.
- **RN-08 Devoluciones:** los errores o devoluciones se corrigen registrando una devolución en la **caja abierta del día**, con motivo. El stock vuelve al inventario y el monto se descuenta de esa caja. Los cierres de caja anteriores nunca cambian.
- **RN-09 Cálculo en el servidor:** el servidor recalcula siempre precios y totales desde la base de datos. El cliente solo envía `productoId` y `cantidad`.
- **RN-10 Cierre de caja:** efectivo esperado = monto inicial + ventas en efectivo de esa caja − devoluciones de esa caja (toda devolución se asume reembolsada en efectivo). La diferencia con el efectivo contado se registra, no se corrige.

## 5. Guía del backend (`api/`)

### 5.1 Convenciones

- Un módulo de NestJS por dominio (controlador, servicio, esquemas Zod). La lógica de negocio va en los servicios, nunca en los controladores.
- Acceso a datos **solo con Drizzle**. Prohibido armar SQL concatenando textos. Si se necesita la plantilla `sql`, solo con valores parametrizados.
- Toda operación que toque stock, ventas, caja o pedidos se ejecuta dentro de **una transacción** (`db.transaction`). Si algo falla, no queda nada a medias.
- Descuento de stock siempre condicionado, para impedir stock negativo aun con peticiones simultáneas:
  ```sql
  UPDATE productos SET stock = stock - :cantidad WHERE id = :id AND stock >= :cantidad
  ```
  Si no se afecta ninguna fila, se cancela la transacción y se responde "stock insuficiente".
- Cada cambio de stock registra una fila en `movimientos_inventario` (`tipo`, `cantidad`, `tipo_referencia`, `id_referencia`).
- Validación de **toda** entrada (body, query, params) con Zod. Se rechazan campos desconocidos. Errores de validación responden 400 con mensaje claro en español.
- Respuestas públicas **no exponen** `costo_centavos`, `proveedor_id` ni datos internos. Usa DTOs de salida separados para el catálogo público.
- Manejo de errores con excepciones de NestJS (`BadRequestException`, `NotFoundException`, `ConflictException`, etc.). No devolver trazas ni detalles internos al cliente.
- Funciones de utilidad de dinero en `common/` (por ejemplo, `sumarCentavos`). Nunca multiplicar por decimales.

### 5.2 Seguridad (obligatoria)

- Guard JWT **global**. Las rutas públicas se marcan explícitamente con `@Public()`; todo lo demás exige sesión de administradora.
- Contraseñas con Argon2id (ya implementado en el alta de la cuenta).
- Login: tras varios intentos fallidos consecutivos se bloquea la cuenta temporalmente usando `intentos_fallidos` y `bloqueada_hasta`. Mensaje genérico ("Credenciales inválidas"), sin revelar si el usuario existe.
- Sesión: JWT en cookie `httpOnly`, `Secure` en producción, `SameSite` configurable por variable de entorno. Expiración equivalente a una jornada de trabajo.
- Protección CSRF ligera: las peticiones que modifican datos deben llevar un encabezado personalizado (por ejemplo `X-Requested-With`), que el servidor exige; combinado con CORS restringido impide envíos desde otros sitios.
- CORS: solo el origen del frontend (variable de entorno `FRONTEND_URL`), con credenciales.
- `@fastify/helmet` activo. `@fastify/rate-limit` global moderado, y más estricto en `POST /auth/login` y `POST /pedidos` (únicos endpoints públicos que escriben datos).
- Nunca registrar contraseñas, tokens ni cookies en los logs.

### 5.3 Rutas de la API (mantener estos nombres)

**Públicas**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Inicio de sesión de la administradora |
| GET | `/categorias` | Categorías activas |
| GET | `/productos` | Productos activos. Filtros: `categoriaId`, `q` (texto) |
| GET | `/productos/:id` | Detalle con imágenes adicionales |
| POST | `/pedidos` | Crea un pedido PENDIENTE y devuelve su código |

**Administradora (requieren sesión)**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/logout` | Cierra la sesión |
| GET | `/auth/me` | Datos de la sesión actual |
| POST, PATCH | `/categorias` | Crear y editar categorías |
| POST, PATCH | `/productos` | Crear y editar productos (incluye costo y proveedor) |
| PATCH | `/productos/:id/baja` | Dar de baja un producto |
| GET | `/pedidos`, `/pedidos/:id` | Listar (filtro `estado`) y ver pedidos |
| POST | `/pedidos/:id/confirmar` | Confirma el pedido, crea la venta ONLINE y descuenta stock |
| POST | `/pedidos/:id/cancelar` | Cancela el pedido |
| POST | `/cajas/abrir` | Abre caja con monto inicial |
| GET | `/cajas/actual` | Caja abierta con totales parciales |
| POST | `/cajas/cerrar` | Cierra caja con efectivo contado |
| GET | `/cajas` | Historial de cierres |
| POST | `/ventas` | Venta de mostrador |
| GET | `/ventas` | Historial de ventas |
| POST | `/devoluciones` | Registra una devolución en la caja abierta |
| CRUD | `/proveedores` | Gestión de proveedores |
| POST | `/inventario/entradas` | Ingreso de mercadería |
| POST | `/inventario/ajustes` | Ajuste manual de stock con nota |
| GET | `/inventario/movimientos` | Historial de movimientos |
| GET | `/reportes/mas-vendidos`, `/reportes/ventas-por-canal`, `/reportes/cierres-de-caja`, `/reportes/margen` | Reportes |

### 5.4 Reglas de implementación de flujos críticos

- **Crear pedido:** validar productos activos y stock, recalcular el total en el servidor, insertar pedido y detalle en una transacción. El código (`PED-0001`, `PED-0002`…) se genera a partir del id con ceros a la izquierda dentro de la misma transacción.
- **Confirmar pedido:** solo si está PENDIENTE. Re-validar stock, permitir ajuste opcional de cantidades, elegir método de pago, crear `ventas` (canal `ONLINE`, `pedido_id`, `caja_id` de la caja abierta si existe) con su detalle y costo vigente, descontar stock, registrar movimientos y marcar el pedido CONFIRMADO con `fecha_confirmacion`.
- **Venta de mostrador:** exige caja abierta. Mismo patrón de validación, descuento y movimientos. Guarda `costo_centavos` vigente en `detalle_venta` para calcular márgenes.
- **Devolución:** exige caja abierta. La cantidad devuelta por producto no puede superar lo vendido menos lo ya devuelto. Monto = precio de la venta original × cantidad. Suma stock y registra movimiento tipo `DEVOLUCION`.
- **Cierre de caja:** calcula efectivo esperado (RN-10), guarda efectivo contado y diferencia, pasa la caja a CERRADA. Una caja cerrada no se puede reabrir ni modificar.
- **Pedidos vencidos:** un pedido PENDIENTE con mucho tiempo sin confirmar se muestra como "Vencido" calculándolo al consultar (sin tareas programadas). La administradora decide cuándo cancelarlo.

### 5.5 Pruebas del backend

Pruebas con Jest, enfocadas en la lógica de mayor riesgo: cálculo de totales en centavos, descuento de stock (incluido el rechazo por stock insuficiente), confirmación de pedido, devoluciones y cierre de caja. No es necesario cubrir controladores triviales.

## 6. Guía del frontend (`web/`)

### 6.1 Convenciones

- Componentes **standalone**, estado con **Signals**, plantillas con el control de flujo moderno (`@if`, `@for`), inyección con `inject()`. Rutas con carga diferida (`loadComponent`).
- Formularios reactivos tipados. Validación en cliente como ayuda de usabilidad; la validación real es del servidor.
- Toda llamada a la API pasa por servicios en `core/`, nunca directamente desde los componentes. Un interceptor HTTP agrega `withCredentials` y el encabezado anti-CSRF, y maneja el 401 redirigiendo al login de administradora.
- La URL de la API y el número de WhatsApp de la tienda se leen de la configuración de entorno (`environment`), no se escriben dentro del código.
- Dinero: un pipe `bs` convierte centavos a texto en Bolivianos (por ejemplo `Bs. 45,50`). Los componentes siempre manejan centavos internamente.
- Estilos solo con Tailwind. Evita CSS propio salvo casos puntuales. Sin librerías de componentes adicionales.
- Seguridad: no usar `innerHTML` con datos de usuario ni `bypassSecurityTrust*`. No guardar tokens en `localStorage` (la sesión es una cookie `httpOnly`).
- Textos de la interfaz en español. Mensajes de error amables y específicos, sin mostrar detalles técnicos.

### 6.2 Experiencia de uso

- **Parte pública:** primero móvil (la mayoría de clientes llegará desde el celular). Tarjetas de producto claras: imagen, nombre, precio, etiqueta "Agotado" y nota de talla.
- **Panel y POS:** pensados para **computadora con teclado y mouse**, sin pantalla táctil. El POS debe poder operarse rápido con teclado: búsqueda de producto con foco automático, Enter para agregar, atajos para cobrar, y totales siempre visibles.
- Estados de carga, vacío y error visibles en todas las listas y formularios. Confirmación antes de acciones sensibles (cerrar caja, cancelar pedido, dar de baja un producto).

### 6.3 Rutas del frontend

**Públicas:** `/` (catálogo con búsqueda y filtro por categoría), `/producto/:id`, `/carrito`.

**Administradora:** `/admin/login`, y bajo un layout protegido por guard: `/admin/pedidos`, `/admin/pos`, `/admin/caja`, `/admin/productos`, `/admin/categorias`, `/admin/inventario`, `/admin/proveedores`, `/admin/reportes`.

### 6.4 Pedido por WhatsApp

1. El cliente completa el carrito (con nota opcional por producto, por ejemplo su talla) y escribe su nombre.
2. El frontend llama a `POST /pedidos`. Solo con la respuesta exitosa (que incluye el código del pedido) se continúa.
3. Se abre `https://wa.me/<numero>?text=<mensaje codificado>`. El mensaje incluye el código, los productos con cantidades y notas, y el total.
4. Se vacía el carrito y se muestra una pantalla de confirmación indicando que la propietaria responderá por WhatsApp.

## 7. Datos y modelo (referencia)

Tablas existentes: `categorias`, `proveedores`, `productos`, `imagenes_producto`, `movimientos_inventario`, `pedidos`, `detalle_pedido`, `ventas`, `detalle_venta`, `devoluciones`, `detalle_devolucion`, `administradora`, `cajas`.

Relaciones clave: `ventas` pertenece a una `caja` (opcional en canal ONLINE) y puede tener un `pedido_id` único; `devoluciones` pertenece a una `venta` y a la `caja` abierta al momento de devolver; `productos.stock` es el stock vigente y `movimientos_inventario` es su historial auditable.

## 8. Fases de desarrollo

Cada fase incluye tareas de backend (B) y frontend (F), y un criterio de terminado. No pases a la siguiente fase hasta cumplirlo.

### F1: Autenticación de la administradora

**B:** módulo `auth` con `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; guard JWT global y decorador `@Public()`; bloqueo temporal por intentos fallidos; cookie `httpOnly`; configuración de `helmet`, `cors`, `cookie` y `rate-limit` en `main.ts`; esquemas Zod y filtro de errores comunes.
**F:** pantalla `/admin/login`; servicio de auth con Signal de sesión; guard de rutas `/admin/**`; interceptor HTTP; layout base del panel con menú lateral y cierre de sesión; pipe `bs`.
**Terminado cuando:** se inicia y cierra sesión desde la interfaz, una ruta de administración sin sesión redirige al login, un usuario o clave incorrectos muestran mensaje genérico y el bloqueo por intentos funciona.

### F2: Categorías y productos (administración)

**B:** módulos `categorias` y `productos` con altas, ediciones y baja lógica; validación de precio y costo en centavos; DTO público separado del DTO interno.
**F:** pantallas `/admin/categorias` y `/admin/productos` con listado, búsqueda, formulario de alta y edición (campos: categoría, proveedor opcional, nombre, descripción, precio, costo, stock inicial, escala, nota de talla, imagen principal por URL e imágenes adicionales por URL).
**Terminado cuando:** la administradora crea, edita y da de baja productos y categorías, los precios se ingresan en Bs. y se guardan en centavos, y un producto dado de baja no aparece en la API pública.

### F3: Catálogo público y carrito

**B:** `GET /categorias`, `GET /productos` (filtros `categoriaId` y `q`) y `GET /productos/:id`, todos públicos y sin datos internos.
**F:** `/` con grilla de productos, búsqueda con retardo mientras se escribe, filtro por categoría y etiqueta "Agotado"; `/producto/:id` con galería; carrito persistente en el navegador (estado en Signals y respaldo local solo del carrito, nunca de datos sensibles); validación de stock disponible en el carrito.
**Terminado cuando:** un visitante navega, busca, filtra, ve el detalle y arma un carrito con notas por producto desde el celular y desde la computadora.

### F4: Pedidos online y confirmación

**B:** módulo `pedidos`: `POST /pedidos` (público, con rate limit estricto), listado y detalle, `POST /pedidos/:id/confirmar`, `POST /pedidos/:id/cancelar`; transacciones y movimientos de inventario según la sección 5.4.
**F:** envío del carrito a la API y apertura de WhatsApp (sección 6.4); pantalla `/admin/pedidos` con pestañas por estado, detalle del pedido con notas del cliente, edición opcional de cantidades, selección de método de pago y botones Confirmar y Cancelar; indicador de pedidos vencidos.
**Terminado cuando:** un pedido enviado desde el catálogo aparece como pendiente con su código, al confirmarlo se crea la venta ONLINE y baja el stock, y al cancelarlo no cambia nada.

### F5: Caja, punto de venta y devoluciones

**B:** módulos `cajas`, `ventas` y `devoluciones` con las reglas RN-06, RN-08 y RN-10.
**F:** `/admin/caja` (apertura, estado de la caja actual con totales parciales, cierre con efectivo contado y diferencia, historial); `/admin/pos` optimizado para teclado y mouse (búsqueda rápida, lista de venta, método de pago, cobro, bloqueo si no hay caja abierta); flujo de devolución desde el historial de ventas, con motivo y selección de productos.
**Terminado cuando:** se abre caja, se registran ventas de mostrador que descuentan stock, se registra una devolución que devuelve stock y descuenta de la caja, y el cierre calcula correctamente el efectivo esperado y la diferencia.

### F6: Inventario y proveedores

**B:** módulos `proveedores` e `inventario` (entradas con proveedor y costo, ajustes con nota, consulta de movimientos).
**F:** `/admin/proveedores` (CRUD) y `/admin/inventario` (ingreso de mercadería, ajuste manual, historial de movimientos con filtro por producto).
**Terminado cuando:** una entrada de mercadería suma stock y deja registro del proveedor y costo, un ajuste exige una nota, y todo cambio de stock aparece en el historial de movimientos.

### F7: Reportes

**B:** `GET /reportes/mas-vendidos`, `/ventas-por-canal`, `/cierres-de-caja` y `/margen`, con filtro por rango de fechas, calculados con consultas agregadas en la base de datos.
**F:** `/admin/reportes` con tablas y gráficos simples para productos más vendidos (para reabastecer), comparación Mostrador vs. Online, historial de cierres de caja y margen por producto, con selector de fechas.
**Terminado cuando:** los reportes coinciden con las ventas, devoluciones y cierres registrados, y las devoluciones restan correctamente de los totales.

### F8: Endurecimiento de seguridad y calidad

**B:** revisión de que todas las rutas no públicas exigen sesión; revisión de validación Zod en todas las entradas; límites de tasa verificados; cabeceras de seguridad; pruebas de Jest de la sección 5.5; `npm audit --omit=dev` revisado.
**F:** revisión de uso de `innerHTML`, manejo de errores y estados vacíos; cabeceras de seguridad en el hosting; limpieza de `console.log`, código muerto y datos de prueba; comprobación de diseño responsivo en la parte pública.
**Terminado cuando:** ninguna ruta de administración responde sin sesión, las pruebas pasan, no hay secretos en el repositorio y no quedan errores en consola durante el uso normal.

### F9: Despliegue y puesta en marcha

**B:** variables de entorno de producción (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `FRONTEND_URL`, configuración de cookie); despliegue de la API en Render; comando de arranque de producción.
**F:** configuración de `environment` de producción (URL de la API, número de WhatsApp real); despliegue en Cloudflare; pruebas completas del flujo con datos reales de la tienda.
**Terminado cuando:** el flujo completo funciona en producción: catálogo, pedido por WhatsApp, confirmación, venta de mostrador, devolución, cierre de caja y reportes.

### F10: Pulido visual (opcional)

**F:** animaciones sutiles con GSAP en el catálogo, ajustes de diseño, iconografía con Lucide, accesibilidad básica (contraste, foco visible, textos alternativos).
**Terminado cuando:** la interfaz es consistente y fluida sin afectar el rendimiento ni la usabilidad del POS.

## 9. Fuera de alcance (no implementar)

- Renderizado en servidor (SSR) y optimización de vistas previas de enlaces: queda como recomendación futura.
- Almacenamiento de imágenes en la nube: las imágenes se referencian por URL.
- Verificación anti-bots (captcha), refresh tokens y tabla de auditoría.
- Stock por talla o variantes de producto.
- Funcionamiento sin conexión del POS.
- Pasarelas de pago en línea: el cobro se coordina por WhatsApp y se registra manualmente.
- Múltiples usuarios o roles: existe una sola administradora.

## 10. Definición de terminado general

Una tarea está terminada solo si: cumple las reglas de negocio de la sección 4, compila sin errores, valida las entradas, maneja los errores con mensajes claros en español, no expone datos internos o secretos, y puede probarse manualmente de punta a punta desde la interfaz.

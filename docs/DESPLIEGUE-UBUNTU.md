# Guía de despliegue en Ubuntu Server (Docker Compose + Nginx)

Guía paso a paso para levantar **Onii-Chan Store** (`api/` + `web/`) en un servidor **Ubuntu Server** usando **Docker** y **Nginx** como proxy inverso en un puerto personalizado.

La base de datos (**Turso**) y el almacenamiento de imágenes (**Cloudflare R2**) siguen en la nube, por lo que el servidor Ubuntu solo necesita Docker y el archivo `api/.env`.

---

## 1. Actualizar Ubuntu e instalar Docker

Conéctate por SSH a tu Ubuntu Server y ejecuta:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw
```

Agrega el repositorio oficial de Docker e instala Docker Engine + Docker Compose:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Permite usar `docker` sin escribir `sudo` cada vez:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verifica que quedó instalado:

```bash
docker --version
docker compose version
```

---

## 2. Configurar el firewall (UFW) con tu puerto elegido

El proyecto usa por defecto el puerto **`8080`** (configurable con `WEB_PORT`). Si prefieres otro puerto (por ejemplo **`8440`** o **`9080`**), reemplaza `8080` por el puerto que elijas en este paso y en el paso 5.

> **Importante:** permite `OpenSSH` antes de activar `ufw` para no perder la conexión SSH.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable
sudo ufw status
```

*(El puerto `3000` de la API **no** se abre en el firewall porque solo se comunica internamente con Nginx dentro de Docker.)*

---

## 3. Clonar el repositorio

```bash
git clone https://github.com/juanvillegas123/tienda.git
cd tienda
```

---

## 4. Crear el archivo `api/.env`

Copia la plantilla y edítala:

```bash
cp api/.env.example api/.env
nano api/.env
```

Genera claves aleatorias seguras (puedes ejecutar esto antes en otra terminal para copiarlas):

```bash
openssl rand -hex 32
```

Completa `api/.env` con tus datos reales (reemplaza `<TU_IP>` por la IP de tu servidor Ubuntu y `<TU_PUERTO>` por el puerto elegido, ej. `8080`):

```env
NODE_ENV=production
PORT=3000

# Base de datos Turso
TURSO_DATABASE_URL=libsql://tu-base.turso.io
TURSO_AUTH_TOKEN=tu-token-turso

# Seguridad y sesión
JWT_SECRET=pega-aqui-clave-aleatoria-1
COOKIE_SECRET=pega-aqui-clave-aleatoria-2
COOKIE_SAME_SITE=lax
# En prueba por IP sin HTTPS debe ser false. Cuando tengas dominio + HTTPS, cámbialo a true.
COOKIE_SECURE=false
FRONTEND_URL=http://<TU_IP>:<TU_PUERTO>

# Cloudflare R2 (imágenes)
R2_ACCOUNT_ID=tu-account-id
R2_JURISDICTION=us
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET_NAME=tu-bucket
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

Guarda con `Ctrl + O`, `Enter`, y sal con `Ctrl + X`.

---

## 5. Elegir el puerto y levantar el servidor

Para usar el puerto por defecto (`8080`):

```bash
docker compose up -d --build
```

Si quieres otro puerto (por ejemplo `8440`), crea un archivo `.env` en la raíz del proyecto (`tienda/.env`, también ignorado por git):

```bash
echo "WEB_PORT=8440" > .env
docker compose up -d --build
```

La primera compilación demora entre 1 y 3 minutos (descarga Node, compila NestJS y Angular).

---

## 6. Verificar que todo esté corriendo

Ver estado de los contenedores:

```bash
docker compose ps
```

Deben aparecer `oniichan-api` y `oniichan-web` con estado `Up`.

Ver logs en tiempo real (sal con `Ctrl + C`):

```bash
docker compose logs -f
```

Prueba rápida desde la terminal del servidor:

```bash
curl -I http://localhost:8080
curl http://localhost:8080/api/categorias
```

Luego abre en el navegador desde tu PC o celular:
- **Tienda pública:** `http://<TU_IP>:<TU_PUERTO>/`
- **Panel de administración:** `http://<TU_IP>:<TU_PUERTO>/admin/login`

---

## 7. Comandos útiles del día a día

| Acción | Comando |
|---|---|
| Actualizar código desde GitHub y reconstruir | `git pull && docker compose up -d --build` |
| Reiniciar solo la API (ej. tras cambiar `api/.env`) | `docker compose up -d --force-recreate api` |
| Reiniciar Nginx (ej. tras editar `deploy/nginx.conf`) | `docker compose restart web` |
| Ver logs de la API | `docker compose logs -f api` |
| Detener todo | `docker compose down` |

---

## 8. Lista de prueba de punta a punta en el servidor

1. Abrir `/` y `/catalogo`: verificar que carguen productos, imágenes de R2, mapa de Google y diseño responsivo en celular.
2. Armar carrito y enviar pedido de prueba por WhatsApp → confirmar que devuelve código `PED-XXXX`.
3. Entrar a `/admin/login` e iniciar sesión → verificar que mantiene la sesión al recargar (F5).
4. Confirmar o cancelar el pedido desde `/admin/pedidos`.
5. Abrir caja (`/admin/caja`), registrar una venta de mostrador (`/admin/pos`), probar una devolución y cerrar caja.
6. Revisar `/admin/reportes` y la vista previa de PDF.

---

## 9. Cuando compres un dominio (migración a HTTPS)

Cuando apuntes un dominio al servidor:
1. Abre los puertos `80` y `443` en `ufw` y usa un proxy con TLS automático (como **Caddy** o **Nginx + Certbot**) apuntando al puerto local de `web`.
2. En `api/.env`, cambia:
   - `FRONTEND_URL=https://tudominio.com`
   - `COOKIE_SECURE=true`
3. En `web/src/environments/environment.prod.ts`, define `siteUrl: 'https://tudominio.com'` y ejecuta `npm run sitemap` antes de reconstruir.

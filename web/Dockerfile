# Etapa 1: compilación de Angular en modo producción
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx ng build

# Etapa 2: servidor estático Nginx
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist/web/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

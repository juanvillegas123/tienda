# Etapa 1: compilación de TypeScript / NestJS
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# Etapa 2: imagen de producción liviana (reutiliza node_modules podados, sin descargar dos veces)
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

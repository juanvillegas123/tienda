# Etapa 1: compilación de TypeScript / NestJS
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Etapa 2: imagen de producción liviana (solo dependencias de runtime)
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

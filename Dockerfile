# syntax=docker/dockerfile:1

# ---------- deps: instala dependências (inclui devDeps p/ build e migrate) ----------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- builder: gera o build standalone do Next ----------
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* são inlinados no build → precisam estar presentes aqui.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PRICE_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PRICE_ID=$NEXT_PUBLIC_STRIPE_PRICE_ID
# DATABASE_URL dummy só para o módulo lib/db não dar throw no import durante o build.
# postgres() é lazy: não conecta. O valor real vem do runtime (compose).
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# ---------- migrator: aplica as migrations Drizzle (roda 1× no compose) ----------
FROM oven/bun:1-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json drizzle.config.ts ./
COPY lib ./lib
# DATABASE_URL é injetado em runtime pelo compose.
CMD ["bunx", "drizzle-kit", "migrate"]

# ---------- runner: imagem final mínima rodando o server standalone ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário não-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

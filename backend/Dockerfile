# Usamos node:20-slim (Debian) em vez de alpine: os engines nativos do Prisma
# são compilados para glibc, e alpine (musl) exige libs extras e ainda assim
# gera avisos de detecção de OpenSSL. slim evita esse atrito.

# ---- deps: instala dependências (com devDependencies) para build ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: gera Prisma Client e compila TypeScript ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production deps: apenas dependências de produção (inclui prisma CLI, usado no migrate deploy) ----
FROM node:20-slim AS prod-deps
WORKDIR /app
# openssl precisa estar presente ANTES do "prisma generate": é assim que o Prisma
# detecta a versão certa do engine (debian-openssl-3.0.x) para bater com o runtime.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---- runtime: imagem final ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./

RUN mkdir -p /app/data && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3333

# Aplica migrations pendentes e só então sobe o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

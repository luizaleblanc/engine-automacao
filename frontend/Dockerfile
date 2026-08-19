# ---- deps ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
# VITE_API_BASE_URL é embutida no bundle em build-time (client-side, não dá pra trocar em runtime).
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:3333
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: Nginx servindo os arquivos estáticos ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

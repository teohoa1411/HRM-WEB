# ── Stage 1: Build Angular ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN sed -i 's|http://verdaccio.up4distribution.info/|https://registry.npmjs.org/|g' package-lock.json && \
    npm ci --registry https://registry.npmjs.org

COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/dist/hrms-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

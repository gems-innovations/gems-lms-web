# Front estático: se compila con el build "static" y lo sirve nginx. No hay Node en producción: las páginas públicas
# se PRERENDERIZAN en este build (app.routes.server.ts) y nginx entrega el HTML de cada ruta (deploy/nginx.conf).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:all && npx ng build main --configuration production,static
# Precomprime el texto (nginx lo sirve con gzip_static). config.js no: se reescribe al arrancar el contenedor.
RUN find dist/main/browser -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \
      -o -name '*.svg' -o -name '*.txt' -o -name '*.webmanifest' \) ! -name config.js -size +1k \
      -exec sh -c 'for f; do gzip -9 -n -c "$f" > "$f.gz"; done' sh {} +

FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf deploy/csp.conf /etc/nginx/gems/
COPY deploy/40-gems-config.sh /docker-entrypoint.d/40-gems-config.sh
RUN chmod +x /docker-entrypoint.d/40-gems-config.sh
COPY --from=build /app/dist/main/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

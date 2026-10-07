# Front estático: se compila con el build "static" (sin SSR) y lo sirve nginx.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:all && npx ng build main --configuration production,static

FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/40-gems-config.sh /docker-entrypoint.d/40-gems-config.sh
RUN chmod +x /docker-entrypoint.d/40-gems-config.sh
COPY --from=build /app/dist/main/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

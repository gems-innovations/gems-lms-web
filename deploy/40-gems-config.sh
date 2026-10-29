#!/bin/sh
# Se ejecuta al arrancar el contenedor: escribe config.js con la URL del API y ajusta el CSP.
set -eu
: "${API_BASE_URL:?Define API_BASE_URL (p. ej. https://api.example.com/api/v1)}"

printf 'globalThis.API_BASE_URL = %s;\n' "\"$API_BASE_URL\"" > /usr/share/nginx/html/config.js
# ID de cliente de Google (público, opcional): sin él no aparece «Continuar con Google».
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  printf 'globalThis.GOOGLE_CLIENT_ID = %s;\n' "\"$GOOGLE_CLIENT_ID\"" >> /usr/share/nginx/html/config.js
fi
# Editor de preguntas de /crear (bandera tapsCreador): encendido; TAPS_CREADOR=0 lo apaga sin recompilar.
if [ "${TAPS_CREADOR:-1}" != 0 ]; then
  printf 'globalThis.tapsCreador = true;\n' >> /usr/share/nginx/html/config.js
fi

api_origin=$(printf %s "$API_BASE_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
# La CSP vive en /etc/nginx/gems/csp.conf (incluida por default.conf); default.conf por si alguna regla la repite.
for conf in /etc/nginx/gems/csp.conf /etc/nginx/conf.d/default.conf; do
  if [ -f "$conf" ]; then sed -i "s#__API_ORIGIN__#${api_origin}#g" "$conf"; fi
done

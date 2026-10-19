FROM node:22-alpine AS verify
WORKDIR /app
COPY . .
RUN for file in *.js tests/*.js tests/*.cjs; do node --check "$file" || exit 1; done \
    && node --test tests/*.test.cjs

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=verify /app/index.html /app/styles.css /app/app.js /app/core.js /app/data.js /app/storage.js /app/spreadsheet.js /app/import-worker.js /app/voice.js /app/translation.js /app/hindi.js /app/diagnostics.js /usr/share/nginx/html/
COPY --from=verify /app/vendor/ /usr/share/nginx/html/vendor/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1


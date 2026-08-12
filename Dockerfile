FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run typecheck && npm run lint && npm test && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8788 PRODUCTIV_DB_PATH=/app/data/productiv.db
RUN useradd --create-home --uid 10001 productiv && mkdir -p /app/data && chown -R productiv:productiv /app
COPY --from=build --chown=productiv:productiv /app/dist ./dist
COPY --from=build --chown=productiv:productiv /app/server ./server
USER productiv
EXPOSE 8788
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:8788/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","server/index.mjs"]

FROM oven/bun:1.4.0 AS bun
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY packages/contracts ./packages/contracts
COPY backend ./backend
COPY website/package.json website/astro.config.mjs website/tsconfig.json ./website/
COPY website/src ./website/src
COPY website/public ./website/public
RUN bun install --frozen-lockfile --filter @web-app-demo/backend --filter @web-app-demo/website
WORKDIR /app/backend
RUN bun run prisma:generate
ARG SOURCE_REVISION
RUN test ${#SOURCE_REVISION} -eq 40
ENV WEBSITE_SOURCE_REVISION=${SOURCE_REVISION}
RUN mkdir -p /app/node_modules/.astro && chown -R node:node /app/website /app/node_modules/.astro
USER node
CMD ["bun", "src/scheduler.ts"]

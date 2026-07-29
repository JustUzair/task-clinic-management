FROM node:24.11.1-bookworm-slim AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN pnpm --filter @clinic/api build

FROM dependencies AS production-dependencies

RUN pnpm install --frozen-lockfile --prod --filter @clinic/api

FROM node:24.11.1-bookworm-slim AS runtime

ENV API_PORT=4000
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /workspace/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --chown=node:node apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
COPY --chown=node:node data ./data

RUN chmod +x /app/apps/api/docker-entrypoint.sh

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.API_PORT || 4000}/healthz`).then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]

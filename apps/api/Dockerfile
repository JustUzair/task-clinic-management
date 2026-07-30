FROM node:24.11.1-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV API_PORT=4000
ENV NODE_ENV=development
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.33.2 --activate

RUN mkdir -p /pnpm && chown node:node /workspace /pnpm

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node apps/web/package.json apps/web/package.json

USER node
RUN pnpm install --frozen-lockfile

COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node apps/api ./apps/api
COPY --chown=node:node data ./data

USER root
RUN chmod +x /workspace/apps/api/docker-entrypoint.sh

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.API_PORT || 4000}/healthz`).then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["/workspace/apps/api/docker-entrypoint.sh"]
CMD ["pnpm", "--filter", "@clinic/api", "dev"]

FROM node:24.11.1-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=development
ENV PORT=3000
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

RUN mkdir -p /pnpm && chown node:node /workspace /pnpm

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node apps/web/package.json apps/web/package.json

USER node
RUN pnpm install --frozen-lockfile

COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node apps/web ./apps/web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["pnpm", "--filter", "@clinic/web", "dev"]

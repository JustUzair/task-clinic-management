FROM node:24.11.1-bookworm-slim AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY tsconfig.base.json ./
COPY apps/web ./apps/web
RUN pnpm --filter @clinic/web build

FROM node:24.11.1-bookworm-slim AS runtime

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/apps/web

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone /app
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "server.js"]

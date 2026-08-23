# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.12 AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/sql/package.json packages/sql/package.json

RUN bun i --frozen-lockfile --linker=isolated

FROM deps AS build

WORKDIR /app

# Vite inlines VITE_* vars at build time, so they must be present here.
ARG VITE_API_URL=http://localhost:3333
ARG VITE_APP_URL=http://localhost:3000
ARG NODE_ENV=production

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV NODE_ENV=${NODE_ENV}

COPY . .
RUN bunx turbo -F frontend build

FROM ghcr.io/static-web-server/static-web-server:2 AS runtime

COPY --from=build /app/frontend/dist /public

# Scratch-based static binary: no OS packages, so ~no CVEs.
ENV SERVER_ROOT=/public
ENV SERVER_PORT=3000
# SPA fallback: client-side routing handles unknown paths.
ENV SERVER_FALLBACK_PAGE=/public/index.html

EXPOSE 3000

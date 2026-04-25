# ── Stage 1: Build React client ──
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Vite writes dist/; fail the image build if it is missing (COPY --from= would error anyway).
RUN npm run build && test -f dist/index.html

# ── Stage 2: Production server ──
FROM node:20-alpine

WORKDIR /app

# Copy server deps & install
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Built assets live outside /app so a bind mount like `-v $PWD:/app` does not
# replace them (host trees usually omit gitignored client/dist).
COPY --from=builder /app/client/dist /usr/share/mafia-client

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIST=/usr/share/mafia-client

EXPOSE 3000

CMD ["node", "server/index.js"]

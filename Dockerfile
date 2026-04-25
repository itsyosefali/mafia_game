# ── Stage 1: Build React client ──
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ──
FROM node:20-alpine

WORKDIR /app

# Copy server deps & install
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]

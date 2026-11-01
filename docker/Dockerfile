# ==============================================================================
# Ultimate Downloader - Production Container Image
# Multi-stage build based on Node.js 22 LTS Debian Bookworm Slim
# Includes: Node.js 22, ffmpeg, python3, yt-dlp official release
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Application
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy dependency specifications for root and workspaces
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies for both server and client workspaces
RUN npm install

# Copy source trees
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

# Compile TypeScript backend and build client static bundle
RUN npm run build

# Remove development dependencies to keep final image slim
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

# Install essential media processing tools and utilities:
# - ffmpeg: audio/video muxing, re-encoding, and trimming
# - python3: execution environment for extraction helpers
# - yt-dlp: modern, maintained YouTube and social media extractor
# - curl & ca-certificates: healthcheck queries and secure downloads
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Application environment configuration
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    DOWNLOAD_DIR=/app/downloads \
    CLIENT_DIST=/app/client/dist

# Copy workspace dependencies from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared ./shared

# Create persistence volume mount point and assign ownership to non-root user
RUN mkdir -p /app/downloads && chown -R node:node /app

# Volume for persisted downloads across container restarts
VOLUME ["/app/downloads"]

# Expose unified application port (serves both API and Vite client)
EXPOSE 4000

# Container health monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Execute container as standard unprivileged node user
USER node

# Start Express media server
CMD ["node", "server/dist/index.js"]

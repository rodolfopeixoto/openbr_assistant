# OpenClaw Enterprise - Dockerfile
# Production-ready container with security hardening

FROM node:22-alpine AS base

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S openclaw -u 1001

# Install security updates
RUN apk update && apk upgrade

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.23.0

# Install dependencies
RUN pnpm install --frozen-lockfile --production

# Production stage
FROM node:22-alpine AS production

# Security hardening
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S openclaw -u 1001

WORKDIR /app

# Copy dependencies from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Copy application code
COPY --chown=openclaw:nodejs . .

# Copy enterprise extensions
COPY --chown=openclaw:nodejs extensions/@openbr-enterprise ./extensions/@openbr-enterprise

# Build extensions
RUN cd extensions/@openbr-enterprise/security-core && npm run build
RUN cd extensions/@openbr-enterprise/compliance-gdpr && npm run build
RUN cd extensions/@openbr-enterprise/compliance-hipaa && npm run build
RUN cd extensions/@openbr-enterprise/compliance-soc2 && npm run build
RUN cd extensions/@openbr-enterprise/performance-optimizer && npm run build
RUN cd extensions/@openbr-enterprise/infra-database && npm run build

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/config
RUN chown -R openclaw:nodejs /app/data /app/logs /app/config

# Security: Remove unnecessary tools
RUN apk del curl wget 2>/dev/null || true

# Switch to non-root user
USER openclaw

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

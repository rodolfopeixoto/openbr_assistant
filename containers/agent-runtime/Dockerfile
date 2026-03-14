# OpenClaw Agent Runtime Dockerfile
# Minimal, secure container for executing agent tools

FROM node:20-alpine

# Security: Create non-root user
RUN addgroup -g 1000 openclaw && \
    adduser -u 1000 -G openclaw -s /bin/sh -D openclaw

# Install minimal system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    ca-certificates \
    tzdata

# Create workspace directory
RUN mkdir -p /workspace && \
    chown -R openclaw:openclaw /workspace

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER openclaw

# Environment variables
ENV NODE_ENV=production \
    HOME=/home/openclaw \
    PATH=/home/openclaw/.local/bin:$PATH

# Metadata
LABEL \
    org.opencontainers.image.title="OpenClaw Agent Runtime" \
    org.opencontainers.image.description="Secure runtime environment for OpenClaw agent tools" \
    org.opencontainers.image.vendor="OpenClaw" \
    org.opencontainers.image.licenses="MIT"

# Default command - just keep container running
CMD ["tail", "-f", "/dev/null"]

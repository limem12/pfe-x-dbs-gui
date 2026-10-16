# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Local WSL/Docker builds can run behind a TLS-inspecting proxy.
# Keep this configurable so stricter environments can override it.
ARG NPM_CONFIG_STRICT_SSL=true
ENV NPM_CONFIG_STRICT_SSL=${NPM_CONFIG_STRICT_SSL}

# Copy the files required for the build.
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

# Install dependencies.
RUN npm ci

# Copy the source code.
COPY src ./src

# Build the application.
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for the healthcheck.
RUN apk add --no-cache curl

# Create a non-root user.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy files from the build stage.
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to the non-root user.
USER nodejs

# Expose the application port.
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/docs >/dev/null || exit 1

# Start the application.
CMD ["node", "dist/main"]


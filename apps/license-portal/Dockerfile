FROM node:22-alpine AS base

# Install dependencies only
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy license-crypto package (shared dependency)
COPY packages/license-crypto/ ./packages/license-crypto/

# Copy license-portal package.json and resolve workspace reference for npm
COPY apps/license-portal/package.json ./
RUN cat package.json | grep -i workspace && \
    sed -i 's/"workspace:[^"]*"/"file:\.\/packages\/license-crypto"/g' package.json && \
    cat package.json | grep -i license-crypto && \
    npm install --legacy-peer-deps

# Build the app
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/license-crypto ./packages/license-crypto
COPY apps/license-portal/ .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3101

ENV PORT=3101
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

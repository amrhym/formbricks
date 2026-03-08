FROM node:22-alpine3.22 AS base

#
## step 1: Prune monorepo
#
# FROM base AS builder
# RUN apk add --no-cache libc6-compat
# RUN apk update
# Set working directory
# WORKDIR /app
# RUN yarn global add turbo
# COPY . .
# RUN turbo prune @hivecfm/web --docker

#
## step 2: Install & build
#
FROM base AS installer

# Enable corepack and prepare pnpm
RUN npm install --ignore-scripts -g corepack@latest 
RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate

# Install necessary build tools and compilers
RUN apk update && apk add --no-cache cmake g++ gcc jq make openssl-dev python3

# Copy the secrets handling script
COPY apps/web/scripts/docker/read-secrets.sh /tmp/read-secrets.sh
RUN chmod +x /tmp/read-secrets.sh

# Increase Node.js memory limit as a regular build argument
ARG NODE_OPTIONS="--max_old_space_size=8192"
ENV NODE_OPTIONS=${NODE_OPTIONS}

# Target architecture - automatically provided by Docker in multi-platform builds
# but needs explicit declaration for some build systems (like Depot)
ARG TARGETARCH

# Base path for the application (optional)
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}

# Public Superset URL for embedded analytics iframe (client-side)
ARG NEXT_PUBLIC_SUPERSET_BASE_URL=""
ENV NEXT_PUBLIC_SUPERSET_BASE_URL=${NEXT_PUBLIC_SUPERSET_BASE_URL}

# Set the working directory
WORKDIR /app

# --- Dependency layer (cached unless lockfile/package.json changes) ---
# Copy only files needed for dependency resolution first
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY patches/ ./patches/

# Copy vendored dependencies required by pnpm install
COPY apps/web/vendor/ ./apps/web/vendor/

# Copy all package.json files from workspaces
COPY apps/web/package.json ./apps/web/package.json
COPY apps/license-portal/package.json ./apps/license-portal/package.json
COPY apps/storybook/package.json ./apps/storybook/package.json
COPY packages/cache/package.json ./packages/cache/package.json
COPY packages/config-eslint/package.json ./packages/config-eslint/package.json
COPY packages/config-prettier/package.json ./packages/config-prettier/package.json
COPY packages/config-typescript/package.json ./packages/config-typescript/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/i18n-utils/package.json ./packages/i18n-utils/package.json
COPY packages/js-core/package.json ./packages/js-core/package.json
COPY packages/license-crypto/package.json ./packages/license-crypto/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/survey-ui/package.json ./packages/survey-ui/package.json
COPY packages/surveys/package.json ./packages/surveys/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/vite-plugins/package.json ./packages/vite-plugins/package.json

# Install dependencies with BuildKit cache mount for pnpm store
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --ignore-scripts

# --- Source layer (changes on every code change, but build caches are preserved) ---
COPY . .

# Create a .env file
RUN touch apps/web/.env

# Build the database package first (with turbo cache)
RUN --mount=type=cache,id=turbo-cache,target=/app/node_modules/.cache \
    pnpm build --filter=@hivecfm/database

# Build the project with BuildKit cache mounts for Next.js and turbo caches
RUN --mount=type=secret,id=database_url \
    --mount=type=secret,id=encryption_key \
    --mount=type=secret,id=redis_url \
    --mount=type=secret,id=sentry_auth_token \
    --mount=type=cache,id=nextjs-cache,target=/app/apps/web/.next/cache \
    --mount=type=cache,id=turbo-cache,target=/app/node_modules/.cache \
    /tmp/read-secrets.sh pnpm build --filter=@hivecfm/web...

# Extract Prisma version
RUN jq -r '.devDependencies.prisma' packages/database/package.json > /prisma_version.txt

#
## step 3: setup production runner
#
FROM base AS runner

RUN npm install --ignore-scripts -g corepack@latest && \
    corepack enable

RUN apk add --no-cache curl \
    && apk add --no-cache supercronic \
    # && addgroup --system --gid 1001 nodejs \
    && addgroup -S nextjs \
    && adduser -S -u 1001 -G nextjs nextjs

WORKDIR /home/nextjs

# Ensure no write permissions are assigned to the copied resources
COPY --from=installer /app/apps/web/.next/standalone ./
RUN chown -R nextjs:nextjs ./ && chmod -R 755 ./

COPY --from=installer /app/apps/web/next.config.mjs .
RUN chmod 644 ./next.config.mjs

COPY --from=installer /app/apps/web/package.json .
RUN chmod 644 ./package.json

COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
RUN chown -R nextjs:nextjs ./apps/web/.next/static && chmod -R 755 ./apps/web/.next/static

COPY --from=installer /app/apps/web/public ./apps/web/public
RUN chown -R nextjs:nextjs ./apps/web/public && chmod -R 755 ./apps/web/public

COPY --from=installer /app/packages/database/schema.prisma ./packages/database/schema.prisma
RUN chown nextjs:nextjs ./packages/database/schema.prisma && chmod 644 ./packages/database/schema.prisma

COPY --from=installer /app/packages/database/dist ./packages/database/dist
RUN chown -R nextjs:nextjs ./packages/database/dist && chmod -R 755 ./packages/database/dist

COPY --from=installer /app/node_modules/@prisma/client ./node_modules/@prisma/client
RUN chown -R nextjs:nextjs ./node_modules/@prisma/client && chmod -R 755 ./node_modules/@prisma/client

COPY --from=installer /app/node_modules/.prisma ./node_modules/.prisma
RUN chown -R nextjs:nextjs ./node_modules/.prisma && chmod -R 755 ./node_modules/.prisma

COPY --from=installer /prisma_version.txt .
RUN chown nextjs:nextjs ./prisma_version.txt && chmod 644 ./prisma_version.txt

COPY --from=installer /app/node_modules/@paralleldrive/cuid2 ./node_modules/@paralleldrive/cuid2
RUN chmod -R 755 ./node_modules/@paralleldrive/cuid2

COPY --from=installer /app/node_modules/@noble/hashes ./node_modules/@noble/hashes
RUN chmod -R 755 ./node_modules/@noble/hashes

COPY --from=installer /app/node_modules/zod ./node_modules/zod
RUN chmod -R 755 ./node_modules/zod

# Copy RLS scripts for multi-tenant database isolation
COPY --from=installer /app/scripts/rls ./scripts/rls
RUN chown -R nextjs:nextjs ./scripts/rls && chmod -R 755 ./scripts/rls

RUN npm install -g prisma@6

# Create a startup script to handle the conditional logic
COPY --from=installer /app/apps/web/scripts/docker/next-start.sh /home/nextjs/start.sh
RUN chown nextjs:nextjs /home/nextjs/start.sh && chmod +x /home/nextjs/start.sh

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
USER nextjs

# Prepare pnpm as the nextjs user to ensure it's available at runtime
# Prepare volumes for uploads and SAML connections
RUN corepack prepare pnpm@9.15.9 --activate && \
    mkdir -p /home/nextjs/apps/web/uploads/ && \
    mkdir -p /home/nextjs/apps/web/saml-connection

VOLUME /home/nextjs/apps/web/uploads/
VOLUME /home/nextjs/apps/web/saml-connection

CMD ["/home/nextjs/start.sh"]
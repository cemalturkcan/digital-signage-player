FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.1

# Copy package files for dependency installation
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/contracts/package.json packages/contracts/
COPY packages/config/package.json packages/config/

# Copy source files of workspace packages (needed for build)
COPY packages/contracts/src packages/contracts/src
COPY packages/contracts/tsconfig.json packages/contracts/
COPY packages/config/src packages/config/src
COPY packages/config/tsconfig.json packages/config/
COPY apps/backend/src apps/backend/src
COPY apps/backend/tsconfig.json apps/backend/
COPY apps/backend/migrations apps/backend/migrations

# Copy root tsconfig for extends
COPY tsconfig.json .

# Install all dependencies (links workspace packages)
RUN pnpm install --frozen-lockfile

# Build workspace packages in dependency order
RUN pnpm --filter @signage/contracts build
RUN pnpm --filter @signage/config build

# Build backend (workspace packages are now available)
RUN pnpm --filter @signage/backend build

# Create production deployment
RUN pnpm --filter @signage/backend deploy --prod /prod/backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built artifacts and production dependencies
COPY --from=builder --chown=nodejs:nodejs /prod/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /prod/backend/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/migrations ./migrations

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]

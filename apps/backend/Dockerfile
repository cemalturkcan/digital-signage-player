FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/contracts/package.json packages/contracts/

COPY packages/contracts/src packages/contracts/src
COPY packages/contracts/tsconfig.json packages/contracts/
COPY apps/backend/src apps/backend/src
COPY apps/backend/tsconfig.json apps/backend/
COPY apps/backend/migrations apps/backend/migrations

COPY tsconfig.json .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @signage/contracts build

RUN pnpm --filter @signage/backend build

RUN pnpm --filter @signage/backend deploy --prod /prod/backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /prod/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /prod/backend/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/migrations ./migrations

RUN mkdir -p /app/public/screenshots && chown -R nodejs:nodejs /app/public

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]

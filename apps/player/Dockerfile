FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/player/package.json apps/player/
COPY packages/contracts/package.json packages/contracts/

COPY packages/contracts/src packages/contracts/src
COPY packages/contracts/tsconfig.json packages/contracts/

COPY apps/player/src apps/player/src
COPY apps/player/public apps/player/public
COPY apps/player/index.html apps/player/
COPY apps/player/vite.config.ts apps/player/
COPY apps/player/tsconfig.json apps/player/
COPY apps/player/tsconfig.app.json apps/player/
COPY apps/player/tsconfig.node.json apps/player/
COPY apps/player/.env.prod apps/player/
COPY tsconfig.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @signage/contracts build
RUN pnpm --filter @signage/player exec vite build --mode prod

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/apps/player/dist ./
COPY apps/player/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

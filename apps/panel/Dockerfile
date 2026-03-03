FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@8.15.1

ARG PANEL_BASE_PATH=/panel/
ARG PANEL_API_BASE_URL=/api
ARG PANEL_PORT=8080

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/panel/package.json apps/panel/
COPY packages/contracts/package.json packages/contracts/

COPY packages/contracts/src packages/contracts/src
COPY packages/contracts/tsconfig.json packages/contracts/

COPY apps/panel/src apps/panel/src
COPY apps/panel/.env.prod apps/panel/
COPY apps/panel/index.html apps/panel/
COPY apps/panel/vite.config.ts apps/panel/
COPY apps/panel/tsconfig.json apps/panel/
COPY tsconfig.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @signage/contracts build
RUN cd apps/panel && VITE_API_BASE_URL=${PANEL_API_BASE_URL} pnpm exec vite build --mode prod --base=${PANEL_BASE_PATH}

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/apps/panel/dist ./
COPY apps/panel/nginx.conf /etc/nginx/templates/default.conf.template
ENV PANEL_PORT=8080
EXPOSE 8080
CMD ["/bin/sh", "-c", "envsubst '$$PANEL_PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

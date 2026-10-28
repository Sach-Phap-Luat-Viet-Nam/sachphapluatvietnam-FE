# Image chạy một app Next.js của monorepo (storefront hoặc admin) ở chế độ standalone.
# Build từ gốc repo: docker build --build-arg APP=storefront --build-arg API_BASE_URL=... -t sachluat-storefront .
# Build arg, biến môi trường lúc chạy: docs/deploy-self-host.md.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /repo

# pnpm đúng bản ghim trong field packageManager.
COPY package.json ./
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

# Copy riêng manifest trước để layer pnpm install được cache khi chỉ sửa code.
# Thêm package mới trong packages/ thì thêm dòng COPY tương ứng.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/storefront/package.json apps/storefront/
COPY apps/admin/package.json apps/admin/
COPY packages/api-client/package.json packages/api-client/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
RUN pnpm install --frozen-lockfile

COPY . .

ARG APP
# Lúc build, trang tĩnh/ISR được render trước nên backend phải gọi được qua URL này.
ARG API_BASE_URL
# NEXT_PUBLIC_* được gắn cứng vào JavaScript phía trình duyệt lúc build.
ARG NEXT_PUBLIC_PUSHER_KEY=
ARG NEXT_PUBLIC_PUSHER_CLUSTER=
ARG NEXT_PUBLIC_STOREFRONT_URL=
ENV NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1 \
    API_BASE_URL=${API_BASE_URL} \
    NEXT_PUBLIC_PUSHER_KEY=${NEXT_PUBLIC_PUSHER_KEY} \
    NEXT_PUBLIC_PUSHER_CLUSTER=${NEXT_PUBLIC_PUSHER_CLUSTER} \
    NEXT_PUBLIC_STOREFRONT_URL=${NEXT_PUBLIC_STOREFRONT_URL}
RUN test -n "$APP" || (echo "Thiếu --build-arg APP=storefront|admin" >&2 && exit 1)
RUN pnpm --filter "@slvn/${APP}" build

FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# server.js của standalone không tự copy public/ và .next/static/.
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /repo/apps/${APP}/public ./apps/${APP}/public

WORKDIR /app/apps/${APP}
USER node
EXPOSE 3000
CMD ["node", "server.js"]

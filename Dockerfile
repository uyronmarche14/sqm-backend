FROM node:20

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and shared packages
COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY packages/permissions-contract ./packages/permissions-contract
COPY sqm-backend/package.json ./sqm-backend/

WORKDIR /app/sqm-backend
RUN pnpm install --frozen-lockfile

COPY sqm-backend/. ./

EXPOSE 3001

CMD ["pnpm", "run", "dev"]

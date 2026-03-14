FROM node:20

WORKDIR /app

COPY packages/permissions-contract ./packages/permissions-contract
COPY sqm-backend/package*.json ./sqm-backend/

WORKDIR /app/sqm-backend
RUN npm ci

COPY sqm-backend/. ./

EXPOSE 3001

CMD ["npm", "run", "dev"]

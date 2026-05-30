# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --frozen-lockfile
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build backend ----
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install --frozen-lockfile
RUN npx prisma generate
COPY backend/src ./src/
COPY backend/tsconfig.json ./
RUN npm run build

# ---- Stage 3: Production image ----
FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install --omit=dev --frozen-lockfile && npx prisma generate

COPY --from=backend-builder /app/backend/dist ./dist/
COPY --from=frontend-builder /app/frontend/dist ./public/

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Push schema to DB then start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]

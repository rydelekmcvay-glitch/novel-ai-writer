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

# Install production dependencies only
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install --omit=dev --frozen-lockfile && npx prisma generate

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist/

# Copy frontend build into backend/public
COPY --from=frontend-builder /app/frontend/dist ./public/

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/data/app.db

EXPOSE 3001

# Apply DB migrations then start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]

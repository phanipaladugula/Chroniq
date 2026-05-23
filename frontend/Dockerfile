# ── Frontend Dockerfile (multi-stage) ───────────────────────────────────────
# Stage 1: Build the React/Vite app
# Stage 2: Serve with nginx (tiny alpine image)
# ────────────────────────────────────────────────────────────────────────────

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source and build
COPY . .

# VITE_API_URL is baked in at build time. The nginx config proxies /api → backend
# so we point Vite to the same origin (empty string = relative URL).
ENV VITE_API_URL=""

RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (dev included for build)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy project files
COPY . .

# Build the NestJS app to ./dist
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built artifacts
COPY --from=builder /app/dist ./dist
# Explicitly copy static folder for the production runtime
COPY --from=builder /app/static ./static

# Railway provides PORT; default to 3000
ENV PORT=3000
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]

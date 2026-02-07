# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all files first to ensure we have package.json and the folder structure
COPY . .

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Build the NestJS app
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package files for production install
COPY --from=builder /app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built artifacts and static folder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static ./static

# Railway provides PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/main"]
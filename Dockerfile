# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (with legacy-peer-deps for React 19 + Apollo Client compatibility)
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Set environment variable for build
ARG NEXT_PUBLIC_SALEOR_API_URL=https://api-production-9c55.up.railway.app/graphql/
ENV NEXT_PUBLIC_SALEOR_API_URL=${NEXT_PUBLIC_SALEOR_API_URL}

ARG NEXT_PUBLIC_API_URL=https://api-production-9c55.up.railway.app
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

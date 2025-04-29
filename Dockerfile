# syntax = docker/dockerfile:1
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
WORKDIR /app
ENV NODE_ENV="production"

# Build stage
FROM base AS build

# Install system dependencies for build tools
RUN apt-get update && \
    apt-get install -y build-essential python3 pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm install --include=dev

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Final production image
FROM base

# Copy production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy built files from build stage
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
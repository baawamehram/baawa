FROM node:20-alpine
WORKDIR /app

# Copy root workspace manifest + lockfile
COPY package.json package-lock.json ./

# Copy server package.json so npm knows the workspace member
COPY server/package.json ./server/

# Install server dependencies only (skips client devDeps entirely)
RUN npm ci --workspace=server --include=dev

# Copy server source
COPY server/ ./server/

# Build server TypeScript only
RUN npm run build --workspace=server

EXPOSE 3001
CMD ["node", "server/dist/src/index.js"]

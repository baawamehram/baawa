FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package.json ./
RUN npm install --include=dev
COPY server/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server/src/db/schema.sql ./dist/src/db/schema.sql
EXPOSE 3001
CMD ["node", "dist/src/index.js"]

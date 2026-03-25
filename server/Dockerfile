FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build --workspace=server

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/server/dist ./dist
EXPOSE 3001
CMD ["node", "dist/src/index.js"]

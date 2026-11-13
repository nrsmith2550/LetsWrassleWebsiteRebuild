# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL=file:/app/data/store.db \
    UPLOAD_DIR=/app/data/uploads
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate && mkdir -p /app/data/uploads
# Persist the database and uploaded images by mounting a volume here
VOLUME ["/app/data"]
EXPOSE 4000
CMD ["npm", "start"]

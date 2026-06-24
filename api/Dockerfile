# --- build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm install

# copy source
COPY . .

# build (NestJS / TS)
RUN npm run build


# --- runtime stage ---
FROM node:20-alpine

WORKDIR /app

# only production deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# copy build output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Prisma generate
RUN npx prisma generate

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]

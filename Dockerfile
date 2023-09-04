FROM node:18-alpine

RUN apk add --no-cache ghostscript graphicsmagick && npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . . 
CMD [ "npm", "run", "start" ]

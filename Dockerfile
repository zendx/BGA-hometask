FROM node:20-alpine AS test

WORKDIR /app

ENV NODE_ENV=test

COPY package*.json ./
RUN npm ci

COPY . .
CMD ["npm", "test"]

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3001 6001

CMD ["npm", "start"]

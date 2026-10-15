
FROM node:22-alpine

WORKDIR /app
COPY ./wallet-service ./wallet-service

WORKDIR /app/wallet-service
RUN npm install && npm run build



CMD ["node" , "dist/index.js"]
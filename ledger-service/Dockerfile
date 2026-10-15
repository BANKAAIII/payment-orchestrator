
FROM node:22-alpine

WORKDIR /app
COPY ./ledger-service ./ledger-service

WORKDIR /app/ledger-service
RUN npm install && npm run build

CMD ["node" , "dist/index.js"]
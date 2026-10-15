FROM node:22-alpine


WORKDIR /app
COPY ./orchestrator-service ./orchestrator-service
WORKDIR /app/orchestrator-service
RUN npm install && npm run build


# CMD now points to the dist folder created by outDir: "./dist"
CMD ["node", "dist/index.js"]
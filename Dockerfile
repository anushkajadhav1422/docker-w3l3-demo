FROM node:22-alpine

WORKDIR /app

COPY app/package*.json ./
COPY app/server.js .
COPY app/test.js .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]

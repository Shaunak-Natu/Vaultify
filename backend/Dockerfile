FROM node:20-alpine

# Install build tools for native modules (better-sqlite3 needs them)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

# Create data directory for SQLite
RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3001

CMD ["node", "src/index.js"]

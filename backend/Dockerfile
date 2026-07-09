FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm install -g typescript
COPY . .
RUN tsc
EXPOSE 3001
CMD ["node", "dist/index.js"]
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
# install all deps to build, then prune dev deps
RUN npm install
COPY src ./src
COPY tsconfig.json ./
RUN npm run build
EXPOSE 8787
CMD ["node", "dist/index.js"]

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV MCP_HTTP_HOST=127.0.0.1
ENV MCP_HTTP_PORT=3000
ENV MCP_HTTP_PATH=/mcp
ENV MCP_HTTP_ALLOWED_HOSTS=localhost,127.0.0.1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/build ./build

USER node

EXPOSE 3000

# The server shuts down gracefully on SIGINT.
STOPSIGNAL SIGINT

ENTRYPOINT ["node", "build/index.js"]
CMD ["http"]

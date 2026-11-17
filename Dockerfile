FROM python:3.12-slim AS build
WORKDIR /src
COPY . .
RUN python3 build.py --env=production --verify

FROM node:22-alpine
WORKDIR /app
COPY serve.mjs md-negotiation.mjs ./
COPY --from=build /src/dist ./dist
ENV NODE_ENV=production
USER node
CMD ["node", "serve.mjs"]

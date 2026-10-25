# Production image for the SPA: build with Node, serve with nginx.
#   docker build -t dealership-web frontend/
# nginx also proxies /api to the backend service named `api` (see nginx.conf).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

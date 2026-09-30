# Stage 1: Build the React application with Node.js
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve the production assets with Nginx
FROM nginx:alpine

# Copy built artifacts from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

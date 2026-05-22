# Stage 1: Build the Vite React application
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY package.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the static files
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install serve package globally to serve static files
RUN npm install -g serve

# Copy built files from the build stage
COPY --from=build /app/dist ./dist

# Expose the frontend port
EXPOSE 5173

# Serve the static files using serve on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

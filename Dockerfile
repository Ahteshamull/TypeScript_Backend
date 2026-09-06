FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies like typescript)
RUN npm install

# Copy all source files
COPY . .

# Build the TypeScript project
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install coturn and curl for WebRTC relay and IP lookup
RUN apk add --no-cache coturn curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled dist folder from builder stage
COPY --from=builder /app/dist ./dist

# Copy the frontend static assets (so the test chat works in production)
COPY public/ ./public/

# Copy start.sh and make it executable, converting CRLF to LF for safety
COPY start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expose HTTP port (5059) and WebRTC TURN ports (3478 tcp/udp)
EXPOSE 5059
EXPOSE 3478/tcp
EXPOSE 3478/udp

# Start the application and TURN server using the startup script
CMD ["sh", "start.sh"]

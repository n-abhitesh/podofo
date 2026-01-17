# Use Node.js LTS
FROM node:20-slim

# Install Ghostscript (required for PDF compression and conversion)
RUN apt-get update && \
    apt-get install -y ghostscript && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create output directory
RUN mkdir -p output uploads

# Expose port (Railway will set PORT env var)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]

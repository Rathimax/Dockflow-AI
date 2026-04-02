# Use a newer Node.js 22 image to support dependencies like pdf-parse
FROM node:22-bullseye-slim

# Install LibreOffice and required fonts/dependencies
# --no-install-recommends helps keep the image size down
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-liberation \
    fonts-dejavu \
    python3 \
    python3-pip \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and run install
COPY package*.json ./
RUN npm install

# Copy all the source code to the working directory
COPY . .

# Expose the API port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]

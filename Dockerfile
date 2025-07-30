FROM node:22

# Install native dependencies for node-canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
# Install JS dependencies and build native modules
RUN npm install --build-from-source
RUN npm rebuild canvas --build-from-source
# Copy application source
COPY . ./
# Expose the Cloud Run default port
EXPOSE 8080
# At runtime, start the API
CMD ["npm", "run", "start"]



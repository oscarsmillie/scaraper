FROM node:22-bookworm

WORKDIR /app

# Install Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy scraper source
COPY . .

# Install Playwright Chromium and required system dependencies
RUN npx playwright install --with-deps chromium

# Run the Playwright scraper
CMD ["npm", "run", "node-scraper"]
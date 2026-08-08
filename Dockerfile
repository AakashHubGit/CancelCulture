FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Ensure the data directory exists and has correct permissions
RUN mkdir -p data && chmod 777 data
# Create an empty trades.json if it doesn't exist, to ensure the app doesn't crash on first boot
RUN if [ ! -f data/trades.json ]; then echo "{}" > data/trades.json; fi
RUN chmod 666 data/trades.json

# Build the Next.js app
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]

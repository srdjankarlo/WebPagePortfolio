FROM node:20-alpine

WORKDIR /app

# Copy package files first for faster building
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

EXPOSE 3000

# Start Vite in development mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
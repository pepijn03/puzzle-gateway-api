# Step 1: Use the Node.js image with a specific version
FROM node:23-alpine

# Step 2: Install pnpm globally
RUN npm install -g pnpm

# Step 3: Set the working directory inside the container
WORKDIR /app

# Step 4: Copy over package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Step 5: Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Step 6: Copy the rest of the application files
COPY . .

# Step 7: Build the application (if applicable)
RUN pnpm run build

# Step 8: Expose the port the app runs on
EXPOSE 3000

# Step 9: Start the app
CMD ["pnpm", "start"]
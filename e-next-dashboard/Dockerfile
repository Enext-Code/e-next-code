# Use the official Node.js 22 image as the base image
FROM node:22

# Create a non-root user to run the application
# This prevents privilege escalation if container is compromised
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy the rest of the application code to the working directory
COPY . .

# Remove .next folder if it exists
RUN rm -rf .next

# Build the Next.js project (still as root, needed for build)
RUN npm run build

# Remove dev dependencies after build to reduce attack surface
# Keep only production dependencies needed at runtime
RUN npm prune --production

# Change ownership of app directory to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user before running the application
# This is CRITICAL for security - prevents RCE from gaining root access
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]




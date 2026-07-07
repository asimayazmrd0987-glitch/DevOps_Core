# ==========================================
# STAGE 1: THE FACTORY (Build Environment)
# ==========================================
# We use the full Node image because we need npm to compile the code.
# "AS builder" gives this stage a name we can reference later.
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files and install them (Leveraging Docker Cache)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code and build the production assets
COPY . .
RUN npm run build
# This creates a 'dist' or 'build' folder containing pure HTML/CSS/JS


# ==========================================
# STAGE 2: THE SHOWROOM (Production Environment)
# ==========================================
# We use Nginx Alpine. It is a tiny, ultra-secure web server (approx 25MB).
# Notice there is NO Node.js in this stage.
FROM nginx:alpine

# THE MAGIC LINE: Copy artifacts FROM the 'builder' stage INTO this stage.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the default Nginx port
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]

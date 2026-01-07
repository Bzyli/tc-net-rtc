FROM node:trixie-slim

WORKDIR /app

# Copy only dependency manifests
COPY package*.json ./

RUN npm install

# Do NOT copy application source code
# It will be provided via a volume mount

EXPOSE 3000
EXPOSE 3478
EXPOSE 3001

CMD ["node", "tc-net.js"]

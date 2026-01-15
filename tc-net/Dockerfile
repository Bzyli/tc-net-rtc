FROM node:trixie-slim

WORKDIR /app

COPY package*.json ./
COPY tc-net.js ./

RUN npm install

EXPOSE 3000
EXPOSE 3001

CMD ["node", "tc-net.js"]

FROM node:trixie-slim

WORKDIR /app

COPY package*.json ./ 

RUN npm install

COPY --chown=node:node . .

EXPOSE 3000
EXPOSE 3478
EXPOSE 49152-65535

CMD ["node", "tc-net.js"]


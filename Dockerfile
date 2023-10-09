FROM node:20
LABEL Description="Bridge deCONZ events to MQTT"

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

CMD [ "node", "server.js" ]

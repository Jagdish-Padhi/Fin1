FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY index.cjs ./

ENV PORT=9999
EXPOSE 9999

ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
CMD ["npm", "run", "start:server"]

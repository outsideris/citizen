FROM node:16-stretch-slim

LABEL maintainer="outsideris@gmail.com"

WORKDIR /citizen
ADD . /citizen

RUN npm install

ENV CITIZEN_DB_DIR ./data
ENV CITIZEN_STORAGE file
ENV CITIZEN_STORAGE_PATH /path/to/store
ENV NODE_ENV=production

EXPOSE 3000

CMD npm run start

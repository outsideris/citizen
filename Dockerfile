# build stage
FROM node:16 as build

WORKDIR /citizen

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .

RUN npm run client

RUN npm run build:linux

# final stage
FROM bitnami/minideb

LABEL maintainer="outsideris@gmail.com"
LABEL org.opencontainers.image.source = "https://github.com/outsideris/citizen"

RUN apt update && apt install -y git jq vim curl

COPY --from=build /citizen/dist/citizen-linux-x64 /usr/local/bin/citizen

WORKDIR /citizen

ENV CITIZEN_DATABASE_TYPE mongodb_or_sqlite
ENV CITIZEN_DATABASE_URL protocol//username:password@hosts:port/database?options
ENV CITIZEN_STORAGE file
ENV CITIZEN_STORAGE_PATH /path/to/store
#ENV CITIZEN_STORAGE_BUCKET BUCKET_IF_STORAGE_IS_S3
ENV NODE_ENV=production

EXPOSE 3000

#COPY ./entrypoint.sh /
#RUN chmod +x /entrypoint.sh
#CMD ["/entrypoint.sh"]

CMD citizen server

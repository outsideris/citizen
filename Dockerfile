# build stage
FROM node:10 as build

LABEL maintainer="AscendonPlatformManagement@csgsystems.onmicrosoft.com"

WORKDIR /citizen
ADD . /citizen

RUN npm install

RUN npm run build

# final stage
FROM bitnami/nginx

COPY --from=build /citizen/dist/citizen-linux /usr/local/bin/citizen

COPY nginx.conf /etc/nginx/nginx.conf

COPY citizen.ascendon.tv.crt /etc/nginx/citizen.ascendon.tv.crt

COPY citizen.ascendon.tv.key /etc/nginx/citizen.ascendon.tv.key

WORKDIR /citizen

ENV NODE_ENV=production

EXPOSE 8443

CMD citizen server

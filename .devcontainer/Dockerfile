ARG VARIANT=16
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# Install MongoDB command line tools
ARG MONGO_TOOLS_VERSION=4.2
ARG GIT_VERSION=2.33.0
RUN curl -sSL "https://www.mongodb.org/static/pgp/server-${MONGO_TOOLS_VERSION}.asc" | (OUT=$(apt-key add - 2>&1) || echo $OUT) \
    && echo "deb http://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/${MONGO_TOOLS_VERSION} main" | tee /etc/apt/sources.list.d/mongodb-org-${MONGO_TOOLS_VERSION}.list \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && curl -sLO "http://ftp.us.debian.org/debian/pool/main/g/git/git_${GIT_VERSION}-1_amd64.deb" \
    && curl -sLO "http://ftp.us.debian.org/debian/pool/main/g/git/git-man_${GIT_VERSION}-1_all.deb" \
    && curl -sLO http://ftp.us.debian.org/debian/pool/main/p/pcre2/libpcre2-8-0_10.36-2_amd64.deb \
    && dpkg -i *.deb \
    && apt-get install -y mongodb-org-tools mongodb-org-shell \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/* \
    && rm -rf *.deb

# Update args in docker-compose.yaml to set the UID/GID of the "node" user.
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then groupmod --gid $USER_GID node && usermod --uid $USER_UID --gid $USER_GID node; fi

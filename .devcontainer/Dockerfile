FROM mcr.microsoft.com/vscode/devcontainers/python:0-3.10@sha256:047ade479c5e6b5f2cde0a3d3f8e55ec00cb87a14d5b0b9815314e0f02722eb8
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils 2>&1 \
    && apt-get -y install \
    curl \
    emacs \
    exa \
    fd-find \
    git \ 
    iproute2 \
    less \ 
    libsodium-dev \
    lsb-release \ 
    man-db \
    manpages \
    net-tools \
    nodejs \ 
    npm \
    openssh-client \ 
    procps \ 
    sudo \
    tldr \
    unzip \
    vim \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

COPY .devcontainer/scripts/notify-dev-entrypoint.sh /usr/local/bin/

EXPOSE 6012

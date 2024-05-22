FROM mcr.microsoft.com/vscode/devcontainers/python:1-3.10@sha256:fefbfc8f22002c0306220894a14269dad379ed6c395c0fdc60b7f0487418ab2f

ENV POETRY_VERSION="1.7.1"

ARG USERNAME=vscode

# Get vscode to work with sudo on all commands with no required password.
RUN apt-get install -y sudo \
    && echo $USERNAME ALL=\(ALL\) NOPASSWD: ALL > /etc/sudoers.d/$USERNAME \
    # && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

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
    libgtk2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

COPY .devcontainer/scripts/notify-dev-entrypoint.sh /usr/local/bin/

COPY --chown=vscode:vscode .devcontainer/scripts/installations.sh /usr/local/bin/
RUN chmod -R 765 /usr/local/bin/installations.sh

# Set the default user, which is remoteUser as defined in the devcontainer.json file.
USER $USERNAME

EXPOSE 6012

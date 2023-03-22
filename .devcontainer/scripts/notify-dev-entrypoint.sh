#!/bin/bash
set -ex

###################################################################
# This script will get executed *once* the Docker container has
# been built. Commands that need to be executed with all available
# tools and the filesystem mount enabled should be located here.
###################################################################

# Define aliases
echo -e "\n\n# User's Aliases" >> ~/.zshrc
echo -e "alias fd=fdfind" >> ~/.zshrc
echo -e "alias l='ls -al --color'" >> ~/.zshrc
echo -e "alias ls='exa'" >> ~/.zshrc
echo -e "alias l='exa -alh'" >> ~/.zshrc
echo -e "alias ll='exa -alh@ --git'" >> ~/.zshrc
echo -e "alias lt='exa -al -T -L 2'" >> ~/.zshrc

# Poetry autocomplete
echo -e "fpath+=/.zfunc" >> ~/.zshrc
echo -e "autoload -Uz compinit && compinit"

# Install Poetry
pip install poetry==${POETRY_VERSION} \
  && poetry --version

# Initialize poetry autocompletions
mkdir ~/.zfunc
touch ~/.zfunc/_poetry
poetry completions zsh > ~/.zfunc/_poetry

# Tell git the workspace repository is safe, else upcoming commands will fail.
git config --global --add safe.directory /workspaces/notification-admin

# Warm up git index prior to display status in prompt else it will
# be quite slow on every invocation of starship.
git status

# Install dependencies
poetry install

npm rebuild node-sass
make generate-version-file
make babel

npm ci install
npm run build
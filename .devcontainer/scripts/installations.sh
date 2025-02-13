#!/bin/bash
set -ex

export POETRY_VERSION="1.7.1"

# Define aliases
echo -e "\n\n# User's Aliases" >> ~/.zshrc
echo -e "alias fd=fdfind" >> ~/.zshrc
echo -e "alias l='ls -al --color'" >> ~/.zshrc
echo -e "alias ls='exa'" >> ~/.zshrc
echo -e "alias l='exa -alh'" >> ~/.zshrc
echo -e "alias ll='exa -alh@ --git'" >> ~/.zshrc
echo -e "alias lt='exa -al -T -L 2'" >> ~/.zshrc
echo -e "alias poe='poetry run poe'" >> ~/.zshrc

echo -e "# fzf key bindings and completion" >> ~/.zshrc
echo -e "source /usr/share/doc/fzf/examples/key-bindings.zsh" >> ~/.zshrc
echo -e "source /usr/share/doc/fzf/examples/completion.zsh" >> ~/.zshrc

# Poetry autocomplete
echo -e "fpath+=/.zfunc" >> ~/.zshrc
echo -e "autoload -Uz compinit && compinit"

# Install Poetry
pip install poetry==${POETRY_VERSION} poetry-plugin-sort
echo "PATH=$PATH"
#echo "/home/vscode/.local/bin/.."
export PATH=$PATH:/home/vscode/.local/bin/
which poetry
poetry --version

# Initialize poetry autocompletions
mkdir -p ~/.zfunc
touch ~/.zfunc/_poetry
poetry completions zsh > ~/.zfunc/_poetry

# Set up git blame to ignore certain revisions e.g. sweeping code formatting changes.
cd /workspace
git config blame.ignoreRevsFile .git-blame-ignore-revs

# Install dependencies
poetry install

# Poe the Poet plugin tab completions
touch ~/.zfunc/_poe
poetry run poe _zsh_completion > ~/.zfunc/_poe

npm rebuild node-sass
make generate-version-file
make babel

npm ci install
npm run build

# install npm deps (i.e. cypress)
cd tests_cypress && npm install && npx cypress install && cd ..

# Install pre-commit hooks
poetry run pre-commit install
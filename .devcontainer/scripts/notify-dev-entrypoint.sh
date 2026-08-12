#!/bin/bash
set -ex

###################################################################
# This script will get executed *once* the Docker container has
# been built. Commands that need to be executed with all available
# tools and the filesystem mount enabled should be located here.
###################################################################

# Include host gitconfig when mounted so aliases and user preferences are available.
if [ -f /home/vscode/.gitconfig-host ]; then
  if ! git config --global --get-all include.path | grep -Fxq /home/vscode/.gitconfig-host; then
    git config --global --add include.path /home/vscode/.gitconfig-host
  fi
fi

# Tell git the workspace repository is safe, else upcoming commands will fail.

git config --global --add safe.directory /workspaces/notification-admin
git config --global --add safe.directory /workspace

# Configure SSH commit signing using the forwarded SSH agent key
if ssh-add -L &>/dev/null; then
  SSH_PUB_KEY=$(ssh-add -L | head -n 1)
  git config --global gpg.format ssh
  git config --global user.signingkey "key::${SSH_PUB_KEY}"
  git config --global commit.gpgsign true
fi


# Install and setup dev environment
installations.sh

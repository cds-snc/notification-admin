# Notifications-admin

Notifications admin application.

## Upstream

This repo is a clone / modifed version of:
https://github.com/alphagov/notifications-admin

## Features of this application

 - Register and manage users
 - Create and manage services
 - Send batch emails and SMS by uploading a CSV
 - Show history of notifications

## Functional constraints

- We currently do not support sending of letters
- We currently do not receive a response if text messages were delivered or not

## First-time setup

Brew is a package manager for OSX. The following command installs brew:
```shell
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

Languages needed
- Python 3.4
- [Node](https://nodejs.org/) 10.15.3 or greater
- [npm](https://www.npmjs.com/) 6.4.1 or greater
```shell
    brew install node
```


[NPM](npmjs.org) is Node's package management tool. `n` is a tool for managing
different versions of Node. The following installs `n` and uses the long term support (LTS)
version of Node.
```shell
    npm install -g n
    n lts
    npm rebuild node-sass
```

### Local installation instruction 

On OS X:

1. Install PyEnv with Homebrew. This will preserve your sanity. 

`brew install pyenv`

2. Install Python 3.6.9 or whatever is the latest

`pyenv install 3.6.9`

3. If you expect no conflicts, set `3.6.9` as you default

`pyenv global 3.6.9`

4. Ensure it installed by running

`python --version` 

if it did not, take a look here: https://github.com/pyenv/pyenv/issues/660

5. Install `virtualenv`:

`pip install virtualenvwrapper`

6. Add the following to your shell rc file. ex: `.bashrc` or `.zshrc`

```
export WORKON_HOME=$HOME/.virtualenvs
export PROJECT_HOME=$HOME/Devel
source  ~/.pyenv/versions/3.6.9/bin/virtualenvwrapper.sh
```

7. Restart your terminal and make your virtual environtment:

`mkvirtualenv -p ~/.pyenv/versions/3.6.9/bin/python notifications-admin`

8. You can now return to your environment any time by entering

`workon notifications-admin`

9. Find the appropriate env variables and copy them into the .env file. A sane set of defaults exists in `.env.example` in the root folder or you can use the ones in the LastPass folder. If using from lastPass and running the API locally, change API_HOST_NAME to point to your local machine

10. Install all dependencies

`pip3 install -r requirements.txt`

11. Generate the version file ?!?

`make generate-version-file`

12. Generate the translations

`make babel`

13.  Run the service

`flask run -p 6012 --host=0.0.0.0`

14. To test

`pip3 install -r requirements_for_test.txt`

`make test`

## Rebuilding the frontend assets

If you want the front end assets to re-compile on changes, leave this running
in a separate terminal from the app
```shell
    npm run watch
```


## Updating application dependencies

`requirements.txt` file is generated from the `requirements-app.txt` in order to pin
versions of all nested dependencies. If `requirements-app.txt` has been changed (or
we want to update the unpinned nested dependencies) `requirements.txt` should be
regenerated with

```
make freeze-requirements
```

`requirements.txt` should be committed alongside `requirements-app.txt` changes.


## Working with static assets

When running locally static assets are served by Flask at http://localhost:6012/static/…

When running on preview, staging and production there’s a bit more to it:

![notify-static-after](https://user-images.githubusercontent.com/355079/50343595-6ea5de80-051f-11e9-85cf-2c20eb3cdefa.png)


## Translations

- Wrap your template text

```
<h1>{{ _('Hello') }}</h1>
```

- For form hints 

Set a variable

```
 <div class="extra-tracking">
  {% set hint_txt = _('We’ll send you a security code by text message') %}
  {{ textbox(form.mobile_number, width='3-4', hint=hint_txt) }}
 </div>
```

For forms

```
from flask_babel import _
```

Wrap your text
```
_('Your text here')
```

For JavaScript

```
// add your text to main_template
window.APP_PHRASES = {
        now: "{{ _('Now') }}",
      }
```

```
// in your JS file
let now_txt = window.polyglot.t("now");
```

- Extract

Currently this is a manual step. Add a row to en.csv and fr.csv in app/translations/csv/ for each new string you have wrapped. The format is: `"wrapped string","translation"`. Make sure the wrapped string you are adding is unique.

- Compile 

```bash
make babel
```

## Using Local Jinja for testing template changes

See the [notification-api](https://github.com/cds-snc/notification-api) README for detailed instructions.

Template files used in this repo: `sms_preview_template.jinja2, email_preview_template.jinja2`

Note: Tests may break if `USE_LOCAL_JINJA_TEMPLATES` is set to `True` in your .env

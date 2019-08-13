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

The app runs within a virtual environment. We use mkvirtualenv for easier working with venvs
```shell
    pip install virtualenvwrapper
    mkvirtualenv -p /usr/local/bin/python3 notifications-admin
```

Install dependencies and build the frontend assets:
```shell
    workon notifications-admin
    ./scripts/bootstrap.sh
```

## Rebuilding the frontend assets

If you want the front end assets to re-compile on changes, leave this running
in a separate terminal from the app
```shell
    npm run watch
```

## Create a local environment.sh file containing the following:

```
echo "
export NOTIFY_ENVIRONMENT='development'
export FLASK_APP=application.py
export FLASK_DEBUG=1
export WERKZEUG_DEBUG_PIN=off
"> environment.sh
```

## AWS credentials

Your aws credentials should be stored in a folder located at `~/.aws`. Follow [Amazon's instructions](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-config-files) for storing them correctly


## Running the application

```shell
    workon notifications-admin
    ./scripts/run_app.sh
```

Then visit [localhost:6012](http://localhost:6012)


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

```bash
pybabel extract -F babel.cfg -k _l -o messages.pot .
pybabel update -i messages.pot -d app/translations
```

- Compile 

```bash
pybabel compile -d app/translations
```
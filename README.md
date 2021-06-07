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

2. Install Python 3.9.1 or whatever is the latest

`pyenv install 3.9.1`

3. If you expect no conflicts, set `3.9.1` as you default

`pyenv global 3.9.1`

4. Ensure it installed by running

`python --version` 

if it did not, take a look here: https://github.com/pyenv/pyenv/issues/660

5. Install `virtualenv`:

`pip install virtualenvwrapper`

6. Add the following to your shell rc file. ex: `.bashrc` or `.zshrc`

```
source  ~/.pyenv/versions/3.9.1/bin/virtualenvwrapper.sh
```

7. Restart your terminal and make your virtual environtment:

`mkvirtualenv -p ~/.pyenv/versions/3.9.1/bin/python notifications-admin`

8. You can now return to your environment any time by entering

`workon notifications-admin`

9. Find the appropriate env variables and copy them into the .env file. A sane set of defaults exists in `.env.example` in the root folder. If you are working for CDS you should use the ones in the LastPass folder. If using from lastPass and running the API locally, change API_HOST_NAME to point to your local machine

10. Install all dependencies

`pip3 install -r requirements.txt`

11. Generate the version file ?!?

`make generate-version-file`

12. Generate the translations

`make babel`

13. Install npm and build the assets 

`npm install` followed by `npm run build`

14.  Run the service

`flask run -p 6012 --host=localhost`

15. To test

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
  {{textbox(form.mobile_number, width='3-4', hint=hint_txt) }}
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

Currently this is a manual step. Add a row to `fr.csv` in `app/translations/csv/` for each new string you have wrapped. The format is: `"wrapped string","translation"`. Make sure the wrapped string you are adding is unique.

- Compile 

```bash
make babel
```

## Using Local Jinja for testing template changes

See the [notification-api](https://github.com/cds-snc/notification-api) README for detailed instructions.

Template files used in this repo: `sms_preview_template.jinja2, email_preview_template.jinja2`

Note: Tests may break if `USE_LOCAL_JINJA_TEMPLATES` is set to `True` in your .env


## Using Docker-compose

A `docker-compose.yml` is provided to anyone that wants to leverage docker as for their setup. You can look at the [full documentation here](https://docs.docker.com/compose/).
To run this project with docker-compose, you will also need to run [notification-api](https://github.com/cds-snc/notification-api) with docker-compose, as it relies on the postgres database set there.

To start the project:

```bash
docker-compose up
```

That's it.

Your site is now available on [http://localhost:6012](http://localhost:6012).


## Redis

You need a [redis](https://redis.io/) server running to use certain parts of Notify, such as the "go live" flow. To use redis, add `REDIS_ENABLED=1` to your .env file and run the following command:

```bash
redis-server
```

=======


# Notifications-admin

Application d'administration des notifications.

## Branche amont (_upstream_)

Ce dépôt Git est une version modifiée de :
https://github.com/alphagov/notifications-admin

## Caractéristiques de cette application

- Enregistrer et gérer les utilisateurs
- Créer et gérer des services
- Envoyer des courriels et des SMS par lots en téléversant un CSV
- Afficher l'historique des notifications

## Contraintes fonctionnelles

- Nous ne pouvons pas actuellement envoyer des lettres
- Nous ne pouvons pas savoir si les SMS ont été délivrés ou non

## Première mise en place

Brew est un gestionnaire de paquets pour OSX. La commande suivante permet d'installer brew :
```shell
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

Langages nécessaires
- Python 3.X
- [Node](https://nodejs.org/) 10.15.3 ou supérieur
- [npm](https://www.npmjs.com/) 6.4.1 ou plus
```shell
brew install node
```

[NPM](npmjs.org) est l'outil de gestion des paquets de Node. `n` est un outil de gestion des
différentes versions de Node. Ce qui suit installe `n` et utilise le support à long terme (LTS)
version de Node.
```shell
npm install -g n
n lts
npm rebuild node-sass
```

### Instruction d'installation locale 

Sur macOS :

1. Installer PyEnv avec Homebrew. Cela vous permettra de préserver votre santé mentale. 

`brew install pyenv`

2. Installez Python 3.9.1 ou la dernière version

`pyenv install 3.9.1`

3. Si vous n'attendez aucun conflit, mettez `3.9.1` comme valeur par défaut

`pyenv global 3.9.1`

4. Assurez-vous qu'il est installé en exécutant

`python --version` 

si ce n'est pas le cas, jetez un coup d'œil ici : https://github.com/pyenv/pyenv/issues/660

5. Installez `virtualenv` :

`pip install virtualenvwrapper`

6. Ajoutez ce qui suit à votre fichier rc shell. ex : `.bashrc` ou `.zshrc`

```
export WORKON_HOME=$HOME/.virtualenvs
export PROJECT_HOME=$HOME/Devel
source ~/.pyenv/versions/3.9.1/bin/virtualenvwrapper.sh
```

7. Redémarrez votre terminal et créez votre environnement virtuel :

`mkvirtualenv -p ~/.pyenv/versions/3.9.1/bin/python notifications-admin`

8. Vous pouvez maintenant retourner dans votre environnement à tout moment en entrant

`workon notifications-admin`

9. Trouvez les variables env appropriées et copiez-les dans le fichier .env. Un ensemble de valeurs par défaut existe dans le fichier `.env.example` à la racine ou vous pouvez utiliser celles du dossier LastPass. Si vous utilisez celles de LastPass et que vous exécutez l'API localement, modifiez `API_HOST_NAME` pour qu'elle pointe vers votre machine locale

10. Installer toutes les dépendances

`pip3 install -r requirements.txt`

11. Générer le fichier de version 

`make generate-version-file`

12. Générer les traductions

`make babel`

13. Installer les dépendances npm et construire les actifs 

`npm install` suivi de `npm run build`.

14.  Démarrer le service

`flask run -p 6012 --host=localhost`.

15. Pour tester

`pip3 install -r requirements_for_test.txt`

`make test`

## Reconstruire les fichiers CSS et JS du frontend

Si vous souhaitez que les fichier JS et CSS soient recompilés en fonction des changements, laissez tourner cette fonction dans un terminal séparé de l'application
```shell
npm run watch
```

## Mise à jour des dépendances des applications

Le fichier `requirements.txt` est généré à partir du fichier `requirements-app.txt` afin d'épingler des versions de toutes les dépendances imbriquées. Si `requirements-app.txt` a été modifié (ou nous voulons mettre à jour les dépendances imbriquées non épinglées) `requirements.txt` devrait être régénérée avec

```
make freeze-requirements
```

Le fichier `requirements.txt` doit être ajouté en même temps que les modifications du fichier `requirements-app.txt`.


## Travailler avec des fichier statiques

Lorsque utilisé localement, les fichiers statiques sont servis par Flask à http://localhost:6012/static/...

Lorsque en production ou sur staging, c'est un peu plus compliqué:

![notify-static-after](https://user-images.githubusercontent.com/355079/50343595-6ea5de80-051f-11e9-85cf-2c20eb3cdefa.png)


## Traductions

- Le texte dans le code est en anglais
- Enveloppez votre texte avec `{{ }}`
- Les traductions sont dans `app/translations/csv/fr.csv`

```
<h1>{{ _('Hello') }}</h1>
```

- Pour des conseils sur les formulaires 

Crée une variable

```
 <div class="extra-tracking">
  {% set hint_txt = _('We’ll send you a security code by text message') %}
  {{textbox(form.mobile_number, width='3-4', hint=hint_txt) }}
 </div>
```

Pour les formulaires

```
from flask_babel import _
```

Enveloppez votre texte
```
_("Votre texte ici")
```

Pour JavaScript

```
// ajoutez votre texte au main_template
window.APP_PHRASES = {
    now: "{{ _('Now') }}",
    }
```

```
// dans vos fichier JS
let now_txt = window.polyglot.t("now") ;
```

- Extrait

Actuellement, il s'agit d'une étape manuelle. Ajoutez une ligne à `fr.csv` dans `app/translations/csv/` pour chaque nouvelle  de charactère que vous avez enveloppée. Le format est le suivant : `"Texte Anglais", "traduction"`. Assurez-vous que la chaîne enveloppée que vous ajoutez est unique.

- Compiler 

```Bash
make babel
```

## Utiliser Jinja localement pour tester les changements de modèles

Voir le dépôt [notification-api](https://github.com/cds-snc/notification-api) README pour des instructions détaillées.

Fichiers de modèles utilisés dans ce dépôt : `sms_preview_template.jinja2, email_preview_template.jinja2`

Note : les tests peuvent échouer si `USE_LOCAL_JINJA_TEMPLATES` est réglé sur `True` dans votre `.env`


## Docker-compose

Un fichier `docker-compose.yml` est disponible à la racine du projet, pour ceux qui veulent utiliser docker. La documentation complète est dispinible [ici](https://docs.docker.com/compose/).
Pour faire fonctionner ce projet avec docker-compose, vous allez aussi avoir besoin du projet notification-api avec docker-compose. Le projet [notification-api](https://github.com/cds-snc/notification-api) a besoin de la base de données postgres qui est fournie par le projet notification-api.

Pour démarrer le projet:

```bash
docker-compose up
```

C'est tout.

Le site est maintenant disponible à l'adresse [http://localhost:6012](http://localhost:6012).

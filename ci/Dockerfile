# Node.js build stage — Node 22 on Alpine (musl) so Rolldown's musl native
# binding resolves correctly. npm install re-resolves platform optional deps.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS node-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.12.16-alpine3.24@sha256:44bf3bcc455e0c9ccd912b78f39019b2f7e9d2f4fb47c6d6973c7638a99aff14

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.7.1"
ENV POETRY_VIRTUALENVS_CREATE false

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git g++ make libffi-dev rust cargo && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel poetry==${POETRY_VERSION} virtualenv==20.30.0

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY pyproject.toml poetry.lock /app/
RUN set -ex && poetry install

COPY . /app
COPY --from=node-build /app/app/static /app/app/static

RUN make babel

RUN make generate-version-file

ENV PORT=6012

ARG GIT_SHA
ENV GIT_SHA ${GIT_SHA}

CMD ["sh", "-c", "gunicorn -c gunicorn_config.py application"]

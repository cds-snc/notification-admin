FROM python:3.10-alpine3.16@sha256:00be2731a1c650d3573aebd84a46c06f3a3251377323f6f43ff1386e70ea2992

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.3.2"
ENV POETRY_VIRTUALENVS_CREATE false

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git nodejs npm g++ make libffi-dev && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel poetry==${POETRY_VERSION}

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY pyproject.toml poetry.lock /app /
RUN set -ex && poetry install

COPY package.json package-lock.json .snyk /app /
RUN npm ci

COPY . /app

RUN make babel

RUN npm run build

RUN make generate-version-file

ENV PORT=6012

ARG GIT_SHA
ENV GIT_SHA ${GIT_SHA}

CMD ["sh", "-c", "gunicorn -c gunicorn_config.py application"]

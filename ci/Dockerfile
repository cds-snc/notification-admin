FROM python:3.10-alpine3.18@sha256:d5ee9613c89c9bd4c4112465d2136512ea8629bce6ff15fa27144f3cc16b5c6b

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.7.1"
ENV POETRY_VIRTUALENVS_CREATE false

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git nodejs npm g++ make libffi-dev rust cargo && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel poetry==${POETRY_VERSION}

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY pyproject.toml poetry.lock /app/
RUN set -ex && poetry install

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

RUN make babel

RUN npm run build

RUN make generate-version-file

ENV PORT=6012

ARG GIT_SHA
ENV GIT_SHA ${GIT_SHA}

CMD ["sh", "-c", "gunicorn -c gunicorn_config.py application"]

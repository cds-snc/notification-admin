FROM python:3.12.7-alpine3.20

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.7.1"
ENV POETRY_VIRTUALENVS_CREATE false
ENV POETRY_HOME="/opt/poetry"
ENV PATH="${POETRY_HOME}/bin:$PATH"

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git nodejs npm g++ make libffi-dev rust cargo && rm -rf /var/cache/apk/*

# Install Poetry in an isolated venv so project deps cannot overwrite its runtime.
RUN python -m venv ${POETRY_HOME}
RUN ${POETRY_HOME}/bin/pip install --upgrade pip wheel
RUN ${POETRY_HOME}/bin/pip install --no-cache-dir poetry==${POETRY_VERSION} virtualenv==20.30.0

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY pyproject.toml poetry.lock /app/
RUN set -ex && poetry install --no-cache -vv

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

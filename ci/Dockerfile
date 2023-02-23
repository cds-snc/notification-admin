FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.3.2"
ENV POETRY_VIRTUALENVS_CREATE false

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    git nodejs \
    npm \
    g++ \
    make \
    libffi-dev \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# update pip
RUN python -m pip install wheel poetry==${POETRY_VERSION}

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY pyproject.toml poetry.lock /app/
RUN set -ex && poetry install

COPY package.json package-lock.json .snyk /app/
RUN npm ci

COPY . /app

RUN make babel

RUN npm run build

RUN make generate-version-file

ENV PORT=6012

ARG GIT_SHA
ENV GIT_SHA ${GIT_SHA}

CMD ["sh", "-c", "gunicorn -c gunicorn_config.py application"]

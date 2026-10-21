# Node.js build stage — Node 22 on Alpine (musl) so Rolldown's musl native
# binding resolves correctly. npm install re-resolves platform optional deps.
FROM node:22.23.1-alpine AS node-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.12.7-alpine3.20

ENV PYTHONDONTWRITEBYTECODE 1
ENV POETRY_VERSION="1.7.1"
ENV POETRY_VIRTUALENVS_CREATE false

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git g++ make libffi-dev rust cargo && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel poetry==${POETRY_VERSION} virtualenv==20.30.0

# -- Install CA certificates and update them to disable emSign ECC Root CA - G3 --
RUN apk add --no-cache ca-certificates && \
    sed -i \
      -e 's|^mozilla/emSign_ECC_Root_CA_-_G3.crt|!&|' \
      -e 's|^mozilla/Comodo_AAA_Services_root.crt|!&|' \
      /etc/ca-certificates.conf && \
    update-ca-certificates --fresh

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

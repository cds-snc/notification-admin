FROM node:10.23.3-alpine
RUN apk add --no-cache bash build-base git
WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app/
RUN npm run build


FROM python:3.9-alpine

ENV PYTHONDONTWRITEBYTECODE 1

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev git g++ make libffi-dev && rm -rf /var/cache/apk/*

# update pip
RUN python -m pip install wheel

# -- Install Application into container:
RUN set -ex && mkdir /app

WORKDIR /app

COPY requirements.txt /app
RUN set -ex && pip3 install -r requirements.txt

COPY --from=0 /app /app/

RUN make babel

RUN make generate-version-file

ENV PORT=6012

ARG GIT_SHA
ENV GIT_SHA ${GIT_SHA}

CMD ["sh", "-c", "gunicorn -c gunicorn_config.py application"]

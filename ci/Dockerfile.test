FROM python:3.9-alpine

ENV PYTHONDONTWRITEBYTECODE 1

# Install deps bump
RUN apk add --no-cache build-base libxml2-dev libxslt-dev git nodejs npm g++ make libffi-dev chromium=79.0.3945.130-r0 chromium-chromedriver && rm -rf /var/cache/apk/*

CMD ["/bin/sh"]
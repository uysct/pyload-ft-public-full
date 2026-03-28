FROM python:3.12-alpine3.22 AS builder

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYCURL_SSL_LIBRARY=openssl

RUN apk add --no-cache \
    build-base \
    cargo \
    curl-dev \
    jpeg-dev \
    libffi-dev \
    linux-headers \
    openssl-dev \
    sqlite-dev \
    zlib-dev

WORKDIR /src
COPY upstream/pyload /src

RUN python -m venv /opt/venv \
 && . /opt/venv/bin/activate \
 && pip install --upgrade pip setuptools wheel \
 && pip install Babel Jinja2 \
 && python setup.py build_locale \
 && pip install pyOpenSSL \
 && pip install /src \
 && rm -rf /opt/venv/lib/python3.12/site-packages/pip* \
           /opt/venv/lib/python3.12/site-packages/setuptools* \
           /opt/venv/lib/python3.12/site-packages/wheel* \
           /opt/venv/bin/pip \
           /opt/venv/bin/pip3 \
           /opt/venv/bin/pip3.12

FROM python:3.12-alpine3.22

ENV PYTHONUNBUFFERED=1 \
    LANG=C.UTF-8 \
    HOME=/config \
    PATH=/opt/venv/bin:$PATH \
    LD_PRELOAD=/lib/libgcompat.so.0

RUN apk add --no-cache \
    7zip \
    ca-certificates \
    curl \
    ffmpeg \
    gcompat \
    libcurl \
    libffi \
    libgcc \
    libjpeg-turbo \
    libstdc++ \
    openssl \
    sqlite \
    tar \
    tesseract-ocr \
    unzip \
    xz

COPY build-assets/unrar /usr/local/bin/unrar
COPY build-assets/default-settings /opt/pyload-defaults
COPY build-assets/changelog /opt/pyload-changelog

COPY --from=builder /opt/venv /opt/venv
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN . /opt/venv/bin/activate \
 && chmod 755 /usr/local/bin/docker-entrypoint.sh /usr/local/bin/unrar \
 && chmod 644 /opt/pyload-defaults/*.cfg \
 && rm -rf /usr/local/lib/python3.12/ensurepip \
           /usr/local/lib/python3.12/idlelib \
           /usr/local/lib/python3.12/tkinter \
           /usr/local/lib/python3.12/test \
           /usr/local/lib/python3.12/tests \
 && find /usr/local/lib/python3.12 \
      \( -type d \( -name test -o -name tests \) \) -prune -exec rm -rf {} + 2>/dev/null || true \
 && mkdir -p /config /downloads /opt/pyload-defaults

EXPOSE 8000 9666
VOLUME ["/config", "/downloads"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["pyload", "--userdir", "/config"]

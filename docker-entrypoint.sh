#!/bin/sh
set -eu

export HOME=/config
export TMPDIR=/tmp

mkdir -p /config /downloads /config/settings /config/data /config/logs
mkdir -p /tmp/pyLoad

first_run=0

if [ ! -s /config/settings/pyload.cfg ]; then
  cp /opt/pyload-defaults/pyload.cfg /config/settings/pyload.cfg
  first_run=1
fi

if [ ! -s /config/settings/plugins.cfg ]; then
  cp /opt/pyload-defaults/plugins.cfg /config/settings/plugins.cfg
  first_run=1
fi

if [ "$first_run" = "1" ]; then
  echo "[entrypoint] Default settings seeded into /config/settings"
fi

if [ "$#" -eq 0 ]; then
  set -- pyload --userdir /config
fi

exec "$@"

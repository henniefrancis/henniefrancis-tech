#!/usr/bin/env bash
# Runs ON THE INSTANCE (as root, via SSM Run Command) during a deploy.
# Installs the nginx site config shipped in the artifact,
# validates it with `nginx -t`, and reloads. If validation fails, the previous
# config is restored so the running server is never left on a broken config.
#
# Usage: install-nginx-conf.sh <dir containing nginx/*.conf from the artifact>
set -euo pipefail

src_dir="${1:?usage: install-nginx-conf.sh <artifact nginx dir>}"
dest_dir="/etc/nginx/conf.d"

shopt -s nullglob
new_confs=("${src_dir}"/*.conf)

if [ "${#new_confs[@]}" -gt 0 ]; then
  backup_dir="$(mktemp -d /var/tmp/nginx-confd-backup.XXXXXX)"
  cp -a "${dest_dir}/." "${backup_dir}/"

  install -m 0644 -o root -g root "${new_confs[@]}" "${dest_dir}/"

  if ! nginx -t; then
    echo "nginx -t failed with the new config; restoring the previous config" >&2
    rm -f "${dest_dir}"/*.conf
    cp -a "${backup_dir}/." "${dest_dir}/"
    nginx -t || echo "WARNING: previous config also fails nginx -t" >&2
    exit 1
  fi
  rm -rf "${backup_dir}"
else
  echo "No nginx/*.conf in the artifact; keeping the existing config"
  nginx -t
fi

systemctl reload nginx
echo "nginx config validated and reloaded"

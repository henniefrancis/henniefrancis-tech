#!/usr/bin/env bash
# render-origin-verify.sh - render the nginx origin verify include from SSM.
#
# Run on the origin instance by the deploy (SSM run command), BEFORE
# `nginx -t` and the reload. It reads the two SecureString parameters
#   <prefix>/current   the secret CloudFront sends now
#   <prefix>/previous  the secret from before the last rotation, or "none"
# and writes lines of the form  "<secret>" 1;  to
#   $ORIGIN_VERIFY_OUT_DIR/origin-verify.inc
# which henniefrancis-tech.conf includes inside its origin_ok map.
#
# Safety:
#   - secret values are never printed and never leave the include file;
#   - values must be alphanumeric, 32 to 64 characters (openssl rand -hex 32 is 64;
#     nginx map keys must fit map_hash_bucket_size), so nothing can
#     inject nginx syntax;
#   - the file is written atomically, mode 0640, group nginx;
#   - on any error the existing file is left untouched.
#
# Environment:
#   AWS_REGION                    required, region of the parameters
#   ORIGIN_VERIFY_PARAM_PREFIX    default /henniefrancis-tech/origin-verify
#   ORIGIN_VERIFY_OUT_DIR         default /etc/nginx/origin-verify.d
#   ORIGIN_VERIFY_GROUP           default nginx (set empty to skip chgrp)
set -euo pipefail
umask 077

: "${AWS_REGION:?AWS_REGION must be set}"
PREFIX="${ORIGIN_VERIFY_PARAM_PREFIX:-/henniefrancis-tech/origin-verify}"
OUT_DIR="${ORIGIN_VERIFY_OUT_DIR:-/etc/nginx/origin-verify.d}"
GROUP="${ORIGIN_VERIFY_GROUP-nginx}"
OUT_FILE="${OUT_DIR}/origin-verify.inc"

get_param() {
  aws ssm get-parameter \
    --name "${PREFIX}/${1}" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}"
}

valid_secret() {
  [[ "$1" =~ ^[A-Za-z0-9]{32,64}$ ]]
}

current="$(get_param current)"
previous="$(get_param previous)"

if ! valid_secret "${current}"; then
  echo "render-origin-verify: current parameter is missing or not a valid secret" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
tmp="$(mktemp "${OUT_DIR}/.origin-verify.XXXXXX")"
trap 'rm -f "${tmp}"' EXIT

printf '"%s" 1;\n' "${current}" >"${tmp}"

accepted=1
if [[ "${previous}" != "none" ]]; then
  if ! valid_secret "${previous}"; then
    echo "render-origin-verify: previous parameter is not a valid secret or none" >&2
    exit 1
  fi
  # nginx rejects duplicate map keys, so skip an unchanged value.
  if [[ "${previous}" != "${current}" ]]; then
    printf '"%s" 1;\n' "${previous}" >>"${tmp}"
    accepted=2
  fi
fi

chmod 0640 "${tmp}"
if [[ -n "${GROUP}" ]]; then
  chgrp "${GROUP}" "${tmp}"
fi
mv -f "${tmp}" "${OUT_FILE}"
trap - EXIT

echo "render-origin-verify: wrote ${accepted} accepted value(s) to ${OUT_FILE}"

#!/usr/bin/env bash
# Behaviour test for henniefrancis-tech.conf, run against a real nginx in Docker.
# Run: bash deploy/nginx/nginx-config.test.sh
#
# Needs docker, openssl and curl. Uses a throw-away self-signed certificate,
# a tiny fake site and dummy verify values (clearly fake, written to a
# temporary include by render-origin-verify.sh with a stubbed aws command).
#
# Covers:
#   - no redirect can ever produce a Location that starts with // or /\
#   - the clean-URL redirects still work and keep the query string
#   - the rate limit on port 80 answers 429
#   - nginx -t and a reload accept a current plus previous verify value of
#     the documented 64 characters, and origin_ok follows both values
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
image="${NGINX_IMAGE:-nginx:1.28-alpine}"
name="hft-nginx-test-$$"
work="$(mktemp -d)"
fail=0

# Docker on Windows (Git Bash) needs native paths and no path rewriting.
if command -v cygpath >/dev/null 2>&1; then
  export MSYS_NO_PATHCONV=1
  native() { cygpath -w "$1"; }
else
  native() { printf '%s' "$1"; }
fi

# shellcheck disable=SC2329  # runs through the EXIT trap
cleanup() {
  docker rm -f "${name}" >/dev/null 2>&1 || true
  rm -rf "${work}"
}
trap cleanup EXIT

# run_ok <label> <command...>: pass when the command succeeds
run_ok() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "ok: ${label}"
  else
    echo "FAIL: ${label}" >&2
    fail=1
  fi
}

check() {
  if [[ "$2" != "$3" ]]; then
    echo "FAIL: $1 (expected '$2', got '$3')" >&2
    fail=1
  else
    echo "ok: $1"
  fi
}

# ── Fixtures ──────────────────────────────────────────────────

mkdir -p "${work}/site/x" "${work}/site/pages" "${work}/certs" "${work}/verify" "${work}/bin"
for f in index.html biography.html x/index.html pages/legacy.html; do
  echo "<p>${f}</p>" >"${work}/site/${f}"
done
echo "<p>404</p>" >"${work}/site/404.html"
echo "<p>50x</p>" >"${work}/site/50x.html"

# Relative file names keep native Windows openssl happy under Git Bash.
(cd "${work}/certs" && openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj "/CN=origin.henniefrancis.tech" -keyout privkey.pem -out fullchain.pem >/dev/null 2>&1)

cat >"${work}/nginx.conf" <<'CONF'
worker_processes 1;
pid /tmp/nginx.pid;
events { worker_connections 256; }
http {
    include /etc/nginx/mime.types;
    limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;
    include /etc/nginx/conf.d/*.conf;
}
CONF

# 64 character dummy values (the length of openssl rand -hex 32).
cur="$(printf 'c%.0s' $(seq 1 64))"
prev="$(printf 'p%.0s' $(seq 1 64))"
other="$(printf 'o%.0s' $(seq 1 64))"

cat >"${work}/bin/aws" <<'STUB'
#!/usr/bin/env bash
name=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--name" ]]; then name="$2"; fi
  shift
done
case "${name}" in
  */current) printf '%s\n' "${STUB_CURRENT}" ;;
  */previous) printf '%s\n' "${STUB_PREVIOUS}" ;;
  *) exit 2 ;;
esac
STUB
chmod +x "${work}/bin/aws"

render() {
  PATH="${work}/bin:${PATH}" AWS_REGION=af-south-1 ORIGIN_VERIFY_OUT_DIR="${work}/verify" \
    ORIGIN_VERIFY_GROUP="" STUB_CURRENT="$1" STUB_PREVIOUS="$2" \
    bash "${here}/render-origin-verify.sh" >/dev/null
  chmod 0644 "${work}/verify/origin-verify.inc"
}

render "${cur}" "${prev}"

docker run -d --name "${name}" \
  -p 127.0.0.1::80 -p 127.0.0.1::443 \
  -v "$(native "${work}/nginx.conf"):/etc/nginx/nginx.conf:ro" \
  -v "$(native "${here}/henniefrancis-tech.conf"):/etc/nginx/conf.d/henniefrancis-tech.conf:ro" \
  -v "$(native "${work}/verify"):/etc/nginx/origin-verify.d:ro" \
  -v "$(native "${work}/certs"):/etc/letsencrypt/live/origin.henniefrancis.tech:ro" \
  -v "$(native "${work}/site"):/var/www/henniefrancis-tech/html:ro" \
  "${image}" >/dev/null

p80="$(docker port "${name}" 80/tcp | head -n1 | sed 's/.*://')"
p443="$(docker port "${name}" 443/tcp | head -n1 | sed 's/.*://')"

for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:${p80}/" 2>/dev/null; then break; fi
  sleep 0.25
done

# req <port-kind> <request-target> [extra curl args...]
# prints "<status> <location>"
req() {
  local kind="$1" target="$2"
  shift 2
  local url host
  if [[ "${kind}" == "80" ]]; then
    url="http://127.0.0.1:${p80}"
    host="henniefrancis.tech"
  else
    url="https://127.0.0.1:${p443}"
    host="origin.henniefrancis.tech"
  fi
  { curl -sk --path-as-is -o /dev/null -D - -H "Host: ${host}" --request-target "${target}" "$@" "${url}" || true; } |
    awk 'BEGIN{s="";l=""} /^HTTP\//{s=$2} tolower($1)=="location:"{l=$2; sub(/\r$/,"",l)} END{print s " " l}'
}

# ── 1. No open redirect ──────────────────────────────────────

for kind in 80 443; do
  for target in \
    '//evil.example/' '//evil.example/index.html' '//evil.example/x.html' '//evil.example/x/' \
    '//evil.example/pages/x.html' '///evil.example/' '////evil.example/x/' '/\evil.example/' \
    '/\evil.example/x.html' '/\\evil.example/' '//evil.example/?a=1' '//' "/\\" \
    'http://evil.example/x/' 'http://evil.example//x/'; do
    out="$(req "${kind}" "${target}")"
    location="${out#* }"
    if [[ "${location}" == //* || "${location}" == /\\* || "${location}" =~ ^[a-zA-Z][a-zA-Z0-9+.-]*: ]]; then
      echo "FAIL: port ${kind} ${target} gave '${out}'" >&2
      fail=1
    else
      echo "ok: port ${kind} ${target} gave '${out}'"
    fi
  done
  check "port ${kind} double slash is refused with 404" "404 " "$(req "${kind}" '//evil.example/')"
  check "port ${kind} slash backslash is refused with 404" "404 " "$(req "${kind}" '/\evil.example/')"
  # Encoded forms stay relative.
  out="$(req "${kind}" '/%5Cevil.example/')"
  location="${out#* }"
  if [[ "${location}" == //* || "${location}" == /\\* ]]; then
    echo "FAIL: port ${kind} encoded backslash gave '${out}'" >&2
    fail=1
  else
    echo "ok: port ${kind} encoded backslash stays relative ('${out}')"
  fi
  # Encoded CR and LF cannot reach the header.
  out="$(req "${kind}" '/x%0d%0aSet-Cookie:%20a=b/')"
  location="${out#* }"
  if [[ "${location}" == *$'\r'* || "${location}" == *Set-Cookie* && "${location}" != *%0d%0a* ]]; then
    echo "FAIL: port ${kind} CRLF handling gave '${out}'" >&2
    fail=1
  else
    echo "ok: port ${kind} encoded CRLF stays encoded ('${out}')"
  fi
done

# ── 2. Clean URL redirects still work and keep the query ──────

for kind in 80 443; do
  check "port ${kind} trailing slash" "301 /biography" "$(req "${kind}" '/biography/')"
  check "port ${kind} .html" "301 /biography" "$(req "${kind}" '/biography.html')"
  check "port ${kind} nested index.html" "301 /x" "$(req "${kind}" '/x/index.html')"
  check "port ${kind} root index.html" "301 /" "$(req "${kind}" '/index.html')"
  check "port ${kind} legacy pages path" "301 /legacy" "$(req "${kind}" '/pages/legacy.html')"
  check "port ${kind} query on trailing slash" "301 /biography?a=1" "$(req "${kind}" '/biography/?a=1')"
  check "port ${kind} empty value keeps the equals sign" "301 /biography?a=" "$(req "${kind}" '/biography/?a=')"
  check "port ${kind} several parameters" "301 /biography?a=b&c=d" "$(req "${kind}" '/biography.html?a=b&c=d')"
  check "port ${kind} encoded value" "301 /x?q=a%26b" "$(req "${kind}" '/x/index.html?q=a%26b')"
  check "port ${kind} query on root index.html" "301 /?utm_source=a" "$(req "${kind}" '/index.html?utm_source=a')"
  check "port ${kind} query on legacy pages path" "301 /legacy?q=1" "$(req "${kind}" '/pages/legacy.html?q=1')"
  check "port ${kind} clean URL serves" "200 " "$(req "${kind}" '/biography')"
  check "port ${kind} unknown path is a 404" "404 " "$(req "${kind}" '/nope')"
  check "port ${kind} 404 page itself is served" "200 " "$(req "${kind}" '/404.html')"
done

# ── 3. Rate limit answers 429 on port 80 only ─────────────────

codes="$(for _ in $(seq 1 90); do curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: henniefrancis.tech' "http://127.0.0.1:${p80}/" || true; done || true)"
n429="$(grep -c '^429$' <<<"${codes}" || true)"
n503="$(grep -c '^503$' <<<"${codes}" || true)"
if [[ "${n429}" -ge 1 && "${n503}" -eq 0 ]]; then
  echo "ok: burst on port 80 gave ${n429} x 429 and no 503"
else
  echo "FAIL: burst on port 80 gave ${n429} x 429 and ${n503} x 503" >&2
  fail=1
fi
codes443="$(for _ in $(seq 1 60); do curl -sk -o /dev/null -w '%{http_code}\n' -H 'Host: origin.henniefrancis.tech' "https://127.0.0.1:${p443}/" || true; done | tr -d '\r' | sort -u | tr '\n' ' ')"
check "port 443 has no rate limit" "200" "${codes443% }"

# ── 4. Verify values: 64 characters, current plus previous ────

run_ok "nginx -t with a current and a previous 64 character value" docker exec "${name}" nginx -t

hit() { # <secret or empty> -> origin_ok value of the last log line
  local secret="$1"
  if [[ -n "${secret}" ]]; then
    curl -sk -o /dev/null -H 'Host: origin.henniefrancis.tech' -H "X-Origin-Verify: ${secret}" "https://127.0.0.1:${p443}/biography" || true
  else
    curl -sk -o /dev/null -H 'Host: origin.henniefrancis.tech' "https://127.0.0.1:${p443}/biography" || true
  fi
  sleep 0.3
  docker logs --tail 1 "${name}" 2>&1 | sed -n 's/.*origin_ok=\([01]\).*/\1/p'
}

check "current value matches" "1" "$(hit "${cur}")"
check "previous value matches" "1" "$(hit "${prev}")"
check "another value does not match" "0" "$(hit "${other}")"
check "a missing header does not match" "0" "$(hit "")"

# The value is never logged.
if docker logs "${name}" 2>&1 | grep -q -e "${cur}" -e "${prev}" -e "${other}"; then
  echo "FAIL: a verify value appears in the log" >&2
  fail=1
else
  echo "ok: no verify value in the log"
fi

# Rotation: the previous value drops out, a new one becomes current, reload.
render "${other}" "${cur}"
run_ok "rotation config accepted" docker exec "${name}" nginx -t
run_ok "rotation config reloaded" docker exec "${name}" nginx -s reload
sleep 1
check "after rotation the new value matches" "1" "$(hit "${other}")"
check "after rotation the old current still matches as previous" "1" "$(hit "${cur}")"
check "after rotation the retired value no longer matches" "0" "$(hit "${prev}")"

# Smallest accepted value (32 characters) and an empty include also load.
render "${cur:0:32}" "none"
run_ok "nginx -t with one 32 character value" docker exec "${name}" nginx -t
: >"${work}/verify/origin-verify.inc"
run_ok "nginx -t with an empty include" docker exec "${name}" nginx -t

exit "${fail}"

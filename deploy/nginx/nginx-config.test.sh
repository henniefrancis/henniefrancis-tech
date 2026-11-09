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
#   - the rate limit on the ACME path of port 80 answers 429
#   - nginx -t and a reload accept a current plus previous verify value of
#     the documented 64 characters, and origin_ok follows both values
#   - lockdown: port 443 answers 403 without a valid X-Origin-Verify header
#     (missing, wrong, or an empty include) and 200 with one
#   - lockdown: port 80 serves only the ACME challenge path; every other
#     path and host gets no response (444)
#   - a verify value is never written to the log
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

mkdir -p "${work}/site/x" "${work}/site/pages" "${work}/certs" "${work}/verify" "${work}/bin" \
  "${work}/certbot/.well-known/acme-challenge"
echo "acme-token-body" >"${work}/certbot/.well-known/acme-challenge/test-token"
for f in index.html biography.html x/index.html pages/legacy.html; do
  echo "<p>${f}</p>" >"${work}/site/${f}"
done
echo "<p>404</p>" >"${work}/site/404.html"
echo "<p>50x</p>" >"${work}/site/50x.html"
for f in chunk-AbC12xYz.js chunk-ABCD1234.js chunk-q7Zk3mWp.js main-ABCD1234.js styles-ab3Cd9Ef.css \
  img-A1B2C3D4.png app.js chunk-abcdefgh.js lazy-document.js my-document.png logo.png styles.css chunk-AbC12xY.js chunk-AbC12xYz9.js; do
  echo "x" >"${work}/site/${f}"
done

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
  -v "$(native "${work}/certbot"):/var/www/certbot:ro" \
  "${image}" >/dev/null

p80="$(docker port "${name}" 80/tcp | head -n1 | sed 's/.*://')"
p443="$(docker port "${name}" 443/tcp | head -n1 | sed 's/.*://')"

for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:${p80}/" 2>/dev/null; then break; fi
  sleep 0.25
done

# req <port-kind> <request-target> [extra curl args...]
# prints "<status> <location>". On 443 it sends the current verify value
# (the lockdown answers 403 without it).
req() {
  local kind="$1" target="$2"
  shift 2
  local url host
  local -a verify=()
  if [[ "${kind}" == "80" ]]; then
    url="http://127.0.0.1:${p80}"
    host="henniefrancis.tech"
  else
    url="https://127.0.0.1:${p443}"
    host="origin.henniefrancis.tech"
    verify=(-H "X-Origin-Verify: ${cur}")
  fi
  { curl -sk --path-as-is -o /dev/null -D - -H "Host: ${host}" "${verify[@]}" --request-target "${target}" "$@" "${url}" || true; } |
    awk 'BEGIN{s="";l=""} /^HTTP\//{s=$2} tolower($1)=="location:"{l=$2; sub(/\r$/,"",l)} END{print s " " l}'
}

# ── 1. No open redirect (port 443 serves the site; port 80 serves nothing) ──

# shellcheck disable=SC2043  # port 80 serves no content any more; kept as a loop for the shared bodies
for kind in 443; do
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

# shellcheck disable=SC2043  # port 80 serves no content any more; kept as a loop for the shared bodies
for kind in 443; do
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

# ── 2b. Hashed build files are immutable, everything else is not ──

cache_control() { # <path> -> the Cache-Control value on 443
  curl -sk -o /dev/null -D - -H 'Host: origin.henniefrancis.tech' -H "X-Origin-Verify: ${cur}" "https://127.0.0.1:${p443}$1" |
    awk 'tolower($1)=="cache-control:" { sub(/^[^:]*: */, ""); sub(/\r$/, ""); print }'
}
immutable="public, max-age=31536000, immutable"
for f in chunk-AbC12xYz.js chunk-ABCD1234.js chunk-q7Zk3mWp.js main-ABCD1234.js styles-ab3Cd9Ef.css img-A1B2C3D4.png; do
  check "hashed file ${f} is immutable" "${immutable}" "$(cache_control "/${f}")"
done
for f in app.js lazy-document.js my-document.png logo.png styles.css chunk-abcdefgh.js chunk-AbC12xY.js chunk-AbC12xYz9.js; do
  check "unhashed or odd file ${f} is not immutable" "no-cache" "$(cache_control "/${f}")"
done
check "html is no-cache with stale-if-error" "no-cache, stale-if-error=86400" "$(cache_control "/404.html")"

# ── 3. Rate limit answers 429 on the ACME path of port 80 only ──

acme_url="http://127.0.0.1:${p80}/.well-known/acme-challenge/test-token"
# One curl process with a URL range reuses the connection, so the burst is fast.
codes="$(curl -s -o /dev/null -w '%{http_code}
' -H 'Host: origin.henniefrancis.tech' "${acme_url}?n=[1-100]" || true)"
n429="$(grep -c '^429$' <<<"${codes}" || true)"
n503="$(grep -c '^503$' <<<"${codes}" || true)"
if [[ "${n429}" -ge 1 && "${n503}" -eq 0 ]]; then
  echo "ok: burst on the ACME path gave ${n429} x 429 and no 503"
else
  echo "FAIL: burst on the ACME path gave ${n429} x 429 and ${n503} x 503" >&2
  fail=1
fi
sleep 2
codes443="$(for _ in $(seq 1 60); do curl -sk -o /dev/null -w '%{http_code}\n' -H 'Host: origin.henniefrancis.tech' -H "X-Origin-Verify: ${cur}" "https://127.0.0.1:${p443}/" || true; done | tr -d '\r' | sort -u | tr '\n' ' ')"
check "port 443 has no rate limit" "200" "${codes443% }"

# ── 3b. Lockdown on port 80: ACME only, everything else dropped ──

# status <curl args>: the HTTP status, 000 when the server closed the connection
status() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || true; }

check "port 80 serves an existing ACME token" "200" "$(status -H 'Host: origin.henniefrancis.tech' "${acme_url}")"
check "port 80 ACME token body is intact" "acme-token-body" "$(curl -s -H 'Host: origin.henniefrancis.tech' "${acme_url}" || true)"
check "port 80 ACME path needs no verify header and a missing token is 404" "404" \
  "$(status -H 'Host: origin.henniefrancis.tech' "http://127.0.0.1:${p80}/.well-known/acme-challenge/none")"
for host in henniefrancis.tech origin.henniefrancis.tech www.henniefrancis.tech other.example; do
  for path in / /biography /index.html /404.html /50x.html /version.json /.well-known/other /.well-known/acme-challenge /robots.txt; do
    check "port 80 ${host}${path} gets no response (444)" "000" "$(status -H "Host: ${host}" "http://127.0.0.1:${p80}${path}")"
  done
done
check "port 80 with the verify header still gets no response" "000" \
  "$(status -H 'Host: henniefrancis.tech' -H "X-Origin-Verify: ${cur}" "http://127.0.0.1:${p80}/")"
check "port 80 POST gets no response" "000" "$(status -X POST -d x=1 -H 'Host: henniefrancis.tech' "http://127.0.0.1:${p80}/")"
check "port 80 path traversal out of the ACME root is refused (400)" "400" \
  "$(status --path-as-is -H 'Host: origin.henniefrancis.tech' "http://127.0.0.1:${p80}/.well-known/acme-challenge/../../../etc/passwd")"

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

# status code of the last log line
logged_status() { docker logs --tail 1 "${name}" 2>&1 | sed -n 's/.*" \([0-9][0-9][0-9]\) .*/\1/p'; }

check "current value matches" "1" "$(hit "${cur}")"
check "current value is served (200)" "200" "$(logged_status)"
check "previous value matches" "1" "$(hit "${prev}")"
check "previous value is served (200)" "200" "$(logged_status)"
check "another value does not match" "0" "$(hit "${other}")"
check "another value is refused (403)" "403" "$(logged_status)"
check "a missing header does not match" "0" "$(hit "")"
check "a missing header is refused (403)" "403" "$(logged_status)"
check "an empty header is refused (403)" "403" \
  "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: origin.henniefrancis.tech' -H 'X-Origin-Verify:' "https://127.0.0.1:${p443}/biography" || true)"
check "a value of the right length but wrong is refused (403)" "403" \
  "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: origin.henniefrancis.tech' -H "X-Origin-Verify: ${cur:0:63}x" "https://127.0.0.1:${p443}/biography" || true)"
for t in / /50x.html /biography/ /.well-known/acme-challenge/test-token; do
  check "a missing header is refused for ${t} (403, before any redirect)" "403" \
    "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: origin.henniefrancis.tech' "https://127.0.0.1:${p443}${t}" || true)"
done

# The log line carries the port and the flag, so 80 and 443 can be told apart.
check "log line names port 443" "1" "$(docker logs "${name}" 2>&1 | grep -c 'origin_ok=1 port=443$' | sed 's/^0$/0/; s/^[1-9][0-9]*$/1/')"
check "log line names port 80" "1" "$(docker logs "${name}" 2>&1 | grep -c 'origin_ok=0 port=80$' | sed 's/^0$/0/; s/^[1-9][0-9]*$/1/')"

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

# Fail closed: an empty include (a failed render) means nobody gets content.
run_ok "empty include config reloaded" docker exec "${name}" nginx -s reload
sleep 1
check "empty include refuses a request with a header (403)" "403"   "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: origin.henniefrancis.tech' -H "X-Origin-Verify: ${cur}" "https://127.0.0.1:${p443}/biography" || true)"
sleep 2
check "empty include still serves the ACME path on port 80" "200" "$(status -H 'Host: origin.henniefrancis.tech' "${acme_url}")"

exit "${fail}"

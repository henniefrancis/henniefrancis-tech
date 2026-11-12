#!/bin/sh
# lockdown-check.sh - check from the outside that the origin is locked down.
#
# Run it from a machine that is NOT CloudFront (your laptop). It needs curl.
# Nothing is committed here: the addresses come from the environment.
#
#   ORIGIN_IPV4=<origin IPv4> ORIGIN_IPV6=<origin IPv6> \
#   SITE_URL=https://<public site> sh deploy/checks/lockdown-check.sh
#
# Checks (PASS or FAIL for each):
#   1. a direct request to the origin over IPv4 on 443 times out
#   2. a direct request to the origin over IPv6 on 443 times out
#   3. port 80 on the origin answers the ACME path (IPv4 and IPv6)
#   4. any other path on port 80 gets no response (nginx 444) (IPv4 and IPv6)
#   5. the site through CloudFront returns 200
#
# Not covered here: a request through the origin hostname with and without
# the X-Origin-Verify header. That needs the secret; see the runbook.
#
# Exit codes: 0 all checks passed, 1 at least one check failed, 2 bad usage.
#
# Environment (optional): CONNECT_TIMEOUT seconds (default 10), the wait that
# counts as a "timeout" on 443.
set -u

connect_timeout="${CONNECT_TIMEOUT:-10}"
failed=0

usage() {
  echo "usage: ORIGIN_IPV4=<ip> ORIGIN_IPV6=<ip> SITE_URL=<https url> sh $0" >&2
  exit 2
}

[ -n "${ORIGIN_IPV4:-}" ] && [ -n "${ORIGIN_IPV6:-}" ] && [ -n "${SITE_URL:-}" ] || usage

# Plain validation, so a typo cannot turn into a different request.
case "${ORIGIN_IPV4}" in
  *[!0-9.]* | "" ) echo "ORIGIN_IPV4 must be a dotted IPv4 address" >&2; exit 2 ;;
esac
case "${ORIGIN_IPV6}" in
  *[!0-9A-Fa-f:]* | "" ) echo "ORIGIN_IPV6 must be an IPv6 address" >&2; exit 2 ;;
esac
case "${SITE_URL}" in
  https://*) ;;
  *) echo "SITE_URL must start with https://" >&2; exit 2 ;;
esac
case "${SITE_URL}" in
  *[[:space:]]* | *\'* | *\"* | *\\* | *\`* | *\$*) echo "SITE_URL has unexpected characters" >&2; exit 2 ;;
esac
site="${SITE_URL%/}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 2
fi

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failed=1; }

# http_code <curl args...>: sets code and rc (the curl exit status)
http_code() {
  code="$(curl -s -o /dev/null -w '%{http_code}' "$@")"
  rc=$?
}

# A direct HTTPS request must time out (curl exit 28): the security group
# drops the packets. Any answer, a refusal or a TLS handshake means the port
# is reachable.
check_timeout_443() {
  label="$1"
  host="$2"
  http_code -k --connect-timeout "${connect_timeout}" "https://${host}/"
  if [ "${rc}" -eq 28 ]; then
    pass "${label}: port 443 timed out"
  elif [ "${rc}" -eq 0 ]; then
    fail "${label}: port 443 answered with HTTP ${code}"
  else
    fail "${label}: port 443 did not time out (curl exit ${rc}); expected a timeout (exit 28)"
  fi
}

# Port 80: the ACME path must be answered by nginx (a 404 for an unknown
# token is the expected answer), everything else must get no reply (444, curl
# exit 52).
check_port_80() {
  label="$1"
  host="$2"
  http_code --max-time 15 "http://${host}/.well-known/acme-challenge/lockdown-check-$$"
  if [ "${rc}" -eq 0 ] && { [ "${code}" = "404" ] || [ "${code}" = "200" ]; }; then
    pass "${label}: port 80 answers the ACME path (HTTP ${code})"
  else
    fail "${label}: port 80 ACME path gave HTTP ${code} (curl exit ${rc}); expected 404 or 200"
  fi
  http_code --max-time 15 "http://${host}/"
  if [ "${rc}" -eq 52 ]; then
    pass "${label}: port 80 gives no response for other paths (444)"
  else
    fail "${label}: port 80 / gave HTTP ${code} (curl exit ${rc}); expected an empty reply (curl exit 52)"
  fi
}

check_timeout_443 "IPv4" "${ORIGIN_IPV4}"

# A timeout over IPv6 only means something if this machine has working IPv6.
# The site has AAAA records, so it serves as the control.
http_code --max-time 20 -6 -L --max-redirs 3 "${site}/"
if [ "${rc}" -eq 0 ] && [ "${code}" = "200" ]; then
  check_timeout_443 "IPv6" "[${ORIGIN_IPV6}]"
  check_port_80 "IPv6" "[${ORIGIN_IPV6}]"
else
  fail "IPv6: this machine cannot reach the site over IPv6 (curl exit ${rc}, HTTP ${code}), so the IPv6 checks are inconclusive; run from a machine with IPv6"
fi

check_port_80 "IPv4" "${ORIGIN_IPV4}"

http_code --max-time 20 -L --max-redirs 3 "${site}/"
if [ "${rc}" -eq 0 ] && [ "${code}" = "200" ]; then
  pass "site through CloudFront returned 200"
else
  fail "site through CloudFront gave HTTP ${code} (curl exit ${rc}); expected 200"
fi

if [ "${failed}" -eq 0 ]; then
  echo "All lockdown checks passed."
else
  echo "At least one lockdown check FAILED." >&2
fi
exit "${failed}"

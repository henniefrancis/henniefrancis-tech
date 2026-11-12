#!/usr/bin/env bash
# Test for lockdown-check.sh with a stub curl (no network, no AWS).
# Run: bash deploy/checks/lockdown-check.test.sh
#
# The stub answers like a locked origin (scenario "locked") or like an open one
# (scenarios "open443", "open80", "site500", "noipv6"). The addresses are
# documentation addresses (RFC 5737 and RFC 3849), not real hosts.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
fail=0
trap 'rm -rf "${work}"' EXIT

cat >"${work}/curl" <<'STUB'
#!/usr/bin/env bash
# prints the http code like curl -w '%{http_code}' and exits with curl's status
url="${*: -1}"
six=0
for a in "$@"; do [[ "$a" == "-6" ]] && six=1; done
out() { printf '%s' "$1"; exit "$2"; }
case "${url}" in
  https://site.example.test/)
    if [[ "${six}" == 1 && "${SCENARIO}" == "noipv6" ]]; then out 000 7; fi
    if [[ "${SCENARIO}" == "site500" ]]; then out 500 0; fi
    out 200 0 ;;
  https://192.0.2.10/ | "https://[2001:db8::10]/")
    if [[ "${SCENARIO}" == "open443" ]]; then out 200 0; fi
    if [[ "${SCENARIO}" == "refused443" ]]; then out 000 7; fi
    out 000 28 ;;
  http://192.0.2.10/.well-known/acme-challenge/* | "http://[2001:db8::10]/.well-known/acme-challenge/"*)
    out 404 0 ;;
  http://192.0.2.10/ | "http://[2001:db8::10]/")
    if [[ "${SCENARIO}" == "open80" ]]; then out 200 0; fi
    out 000 52 ;;
esac
out 000 6
STUB
chmod +x "${work}/curl"

run() { # <scenario> [env...] -> prints output, sets rc
  local scenario="$1"
  shift
  set +e
  output="$(env -i PATH="${work}:${PATH}" SCENARIO="${scenario}" \
    ORIGIN_IPV4=192.0.2.10 ORIGIN_IPV6=2001:db8::10 SITE_URL=https://site.example.test "$@" \
    sh "${here}/lockdown-check.sh" 2>&1)"
  rc=$?
  set -e
}

expect() { # <label> <expected rc> <expected text or empty>
  if [[ "${rc}" -eq "$2" && ( -z "$3" || "${output}" == *"$3"* ) ]]; then
    echo "ok: $1"
  else
    echo "FAIL: $1 (rc ${rc}, wanted $2 and '$3')" >&2
    echo "${output}" >&2
    fail=1
  fi
}

run locked
expect "locked origin passes" 0 "All lockdown checks passed."
if [[ "$(grep -c '^PASS' <<<"${output}")" -eq 7 && "${output}" != *FAIL* ]]; then echo "ok: seven PASS lines"; else echo "FAIL: expected seven PASS lines" >&2; echo "${output}" >&2; fail=1; fi

run open443
expect "open 443 fails" 1 "FAIL: IPv4: port 443 answered"
expect "open 443 also fails over IPv6" 1 "FAIL: IPv6: port 443 answered"

run refused443
expect "a refusal is not a timeout" 1 "did not time out"

run open80
expect "other paths answered on port 80 fail" 1 "FAIL: IPv4: port 80 / gave HTTP 200"

run site500
expect "a broken site fails" 1 "FAIL: site through CloudFront gave HTTP 500"

run noipv6
expect "no local IPv6 is reported, not passed" 1 "inconclusive"

run locked ORIGIN_IPV4=
expect "missing address is a usage error" 2 "usage:"
run locked ORIGIN_IPV4=192.0.2.10\;id
expect "a bad IPv4 value is refused" 2 "ORIGIN_IPV4"
run locked ORIGIN_IPV6=zz
expect "a bad IPv6 value is refused" 2 "ORIGIN_IPV6"
run locked SITE_URL=http://site.example.test
expect "an http site URL is refused" 2 "https://"
# shellcheck disable=SC2016  # the dollar sign is the point of the test
run locked 'SITE_URL=https://site.example.test/$(id)'
expect "a site URL with shell characters is refused" 2 "unexpected characters"

exit "${fail}"

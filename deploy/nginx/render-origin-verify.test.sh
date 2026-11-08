#!/usr/bin/env bash
# Test for render-origin-verify.sh using a stub `aws` command.
# Run: bash deploy/nginx/render-origin-verify.test.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

mkdir -p "${work}/bin"
cat >"${work}/bin/aws" <<'STUB'
#!/usr/bin/env bash
# Stub: returns the value for the requested parameter from env vars.
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

export PATH="${work}/bin:${PATH}"
export AWS_REGION="af-south-1"
export ORIGIN_VERIFY_OUT_DIR="${work}/out"
export ORIGIN_VERIFY_GROUP=""

a="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
b="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
fail=0

check() {
  if [[ "$2" != "$3" ]]; then
    echo "FAIL: $1 (expected '$2', got '$3')" >&2
    fail=1
  else
    echo "ok: $1"
  fi
}

# 1. current only, previous is the placeholder
STUB_CURRENT="${a}" STUB_PREVIOUS="none" bash "${here}/render-origin-verify.sh" >/dev/null
check "current only" "\"${a}\" 1;" "$(cat "${work}/out/origin-verify.inc")"

# 2. current and previous
STUB_CURRENT="${a}" STUB_PREVIOUS="${b}" bash "${here}/render-origin-verify.sh" >/dev/null
check "two values" "2" "$(wc -l <"${work}/out/origin-verify.inc" | tr -d ' ')"

# 3. identical previous is not duplicated
STUB_CURRENT="${a}" STUB_PREVIOUS="${a}" bash "${here}/render-origin-verify.sh" >/dev/null
check "no duplicate key" "1" "$(wc -l <"${work}/out/origin-verify.inc" | tr -d ' ')"

# 4. invalid current leaves the file untouched and fails
before="$(cat "${work}/out/origin-verify.inc")"
if STUB_CURRENT='short";}' STUB_PREVIOUS="none" bash "${here}/render-origin-verify.sh" >/dev/null 2>&1; then
  echo "FAIL: invalid current accepted" >&2
  fail=1
else
  echo "ok: invalid current rejected"
fi
check "file untouched after failure" "${before}" "$(cat "${work}/out/origin-verify.inc")"

# 5. nginx syntax injection in previous is rejected
if STUB_CURRENT="${a}" STUB_PREVIOUS="${b}\";} server {" bash "${here}/render-origin-verify.sh" >/dev/null 2>&1; then
  echo "FAIL: injection accepted" >&2
  fail=1
else
  echo "ok: injection rejected"
fi

# 5b. length limits: 31 and 65 characters are refused, 32 and 64 are accepted
before="$(cat "${work}/out/origin-verify.inc")"
for bad in "${a:0:31}" "${a}a"; do
  if STUB_CURRENT="${bad}" STUB_PREVIOUS="none" bash "${here}/render-origin-verify.sh" >/dev/null 2>&1; then
    echo "FAIL: length ${#bad} accepted" >&2
    fail=1
  else
    echo "ok: length ${#bad} rejected"
  fi
  if STUB_CURRENT="${a}" STUB_PREVIOUS="${bad}" bash "${here}/render-origin-verify.sh" >/dev/null 2>&1; then
    echo "FAIL: previous length ${#bad} accepted" >&2
    fail=1
  else
    echo "ok: previous length ${#bad} rejected"
  fi
done
check "file untouched after length failures" "${before}" "$(cat "${work}/out/origin-verify.inc")"
STUB_CURRENT="${a:0:32}" STUB_PREVIOUS="${b}" bash "${here}/render-origin-verify.sh" >/dev/null
check "32 and 64 characters accepted" "2" "$(wc -l <"${work}/out/origin-verify.inc" | tr -d ' ')"

# 6. the secret is never printed
out="$(STUB_CURRENT="${a}" STUB_PREVIOUS="${b}" bash "${here}/render-origin-verify.sh" 2>&1)"
if [[ "${out}" == *"${a}"* || "${out}" == *"${b}"* ]]; then
  echo "FAIL: secret printed" >&2
  fail=1
else
  echo "ok: secret not printed"
fi

# 7. output mode is 0640
mode="$(stat -c '%a' "${work}/out/origin-verify.inc" 2>/dev/null || stat -f '%Lp' "${work}/out/origin-verify.inc")"
check "file mode" "640" "${mode}"

exit "${fail}"

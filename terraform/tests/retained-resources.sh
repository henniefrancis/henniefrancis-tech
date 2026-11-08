#!/usr/bin/env bash
# Static check: every retained resource carries lifecycle { prevent_destroy = true }.
# terraform test cannot read prevent_destroy from plan attributes, so this
# checks the source. Run from anywhere: bash terraform/tests/retained-resources.sh
#
# Retained resources:
#   image bucket, artifacts bucket, Elastic IP, CloudFront distribution,
#   ACM certificate.
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

# resource-type:resource-name
retained=(
  "aws_s3_bucket:images"
  "aws_s3_bucket:artifacts"
  "aws_eip:web"
  "aws_cloudfront_distribution:frontend"
  "aws_acm_certificate:frontend"
)

for item in "${retained[@]}"; do
  type="${item%%:*}"
  name="${item##*:}"
  # Print the resource block (from its header to the closing brace at column 0)
  # and look for prevent_destroy = true inside it.
  # shellcheck disable=SC2016  # the awk program is meant to be literal
  if find "${dir}" -maxdepth 1 -name '*.tf' -print0 |
    xargs -0 awk -v header="resource \"${type}\" \"${name}\" {" '
      $0 == header { inblock = 1 }
      inblock { print }
      inblock && $0 == "}" { inblock = 0 }
    ' | grep -Eq '^[[:space:]]*prevent_destroy[[:space:]]*=[[:space:]]*true'; then
    echo "ok: ${type}.${name} has prevent_destroy"
  else
    echo "FAIL: ${type}.${name} is missing prevent_destroy = true" >&2
    fail=1
  fi
done

exit "${fail}"

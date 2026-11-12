#!/usr/bin/env bash
# Static check: no security group rule opens port 443 (or all ports) to the
# world. terraform test cannot list every rule resource, so this reads the
# source. Run from anywhere: bash terraform/tests/no-world-443.sh
#
# Port 443 may only be reached through the CloudFront prefix list groups
# (security_groups.tf). A rule counts as a violation when its block has a
# world CIDR (0.0.0.0/0 or ::/0) and either covers 443 (a from_port or
# to_port of 443, or a range that includes it) or all protocols. Egress rules
# are not checked.
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

# scan <dir>: print "file:resource" for each offending ingress block.
scan() {
  # shellcheck disable=SC2016  # the awk program is meant to be literal
  find "$1" -maxdepth 1 -name '*.tf' -print0 |
  xargs -0 awk '
    function check() {
      if (block == "") return
      world = (block ~ /"0\.0\.0\.0\/0"/ || block ~ /"::\/0"/)
      covers = (block ~ /(from_port|to_port)[ \t]*=[ \t]*443/ || block ~ /ip_protocol[ \t]*=[ \t]*"-1"/ || block ~ /protocol[ \t]*=[ \t]*"-1"/)
      # a range that includes 443, for example 0 to 65535
      if (match(block, /from_port[ \t]*=[ \t]*[0-9]+/)) {
        f = substr(block, RSTART, RLENGTH); gsub(/[^0-9]/, "", f)
        if (match(block, /to_port[ \t]*=[ \t]*[0-9]+/)) {
          t = substr(block, RSTART, RLENGTH); gsub(/[^0-9]/, "", t)
          if (f + 0 <= 443 && t + 0 >= 443) covers = 1
        }
      }
      if (world && covers) print FILENAME ":" name
      block = ""
    }
    /^resource "aws_vpc_security_group_ingress_rule"/ || /^resource "aws_security_group_rule"/ || /^resource "aws_security_group"/ {
      inblock = 1; name = $2 "." $3; block = ""
    }
    inblock {
      # skip egress blocks and egress rule resources
      block = block "\n" $0
    }
    inblock && $0 == "}" { inblock = 0; if (block !~ /type[ 	]*=[ 	]*"egress"/) check(); block = "" }
  '
}

violations="$(scan "${dir}")"

if [[ -n "${violations}" ]]; then
  while IFS= read -r v; do
    echo "FAIL: ${v##*/} opens 443 or all ports to the world" >&2
  done <<<"${violations}"
  fail=1
else
  echo "ok: no rule opens 443 or all ports to the world"
fi

# Controls: the scan must flag a world 443 rule and accept a prefix list rule.
tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT
mkdir "${tmp}/bad" "${tmp}/good"
cat >"${tmp}/bad/bad.tf" <<'TF'
resource "aws_vpc_security_group_ingress_rule" "bad" {
  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}
TF
cat >"${tmp}/good/good.tf" <<'TF'
resource "aws_vpc_security_group_ingress_rule" "http" {
  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "https_cf" {
  from_port      = 443
  to_port        = 443
  ip_protocol    = "tcp"
  prefix_list_id = "pl-0123456789abcdef0"
}
TF
if [[ -n "$(scan "${tmp}/bad")" && -z "$(scan "${tmp}/good")" ]]; then
  echo "ok: the scan flags a world 443 rule and accepts port 80 plus a prefix list"
else
  echo "FAIL: the scan controls did not behave" >&2
  fail=1
fi

exit "${fail}"

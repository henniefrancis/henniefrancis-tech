#!/usr/bin/env bash
# Install a pinned CI tool from its vendor GitHub release and verify the
# SHA-256 of the archive before extracting it. Pins live here, in one place.
#
# Usage: install-tool.sh <gitleaks|trivy|actionlint|tflint|shellcheck>
#
# To bump a tool: change VERSION and SHA256 together, taking the checksum from
# the vendor's published checksums file for that exact release.
set -euo pipefail

tool="${1:-}"
bin_dir="${RUNNER_TEMP:-/tmp}/tool-bin"

case "$tool" in
  gitleaks)
    version="8.30.1"
    archive="gitleaks_${version}_linux_x64.tar.gz"
    url="https://github.com/gitleaks/gitleaks/releases/download/v${version}/${archive}"
    sha256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
    ;;
  trivy)
    version="0.76.2"
    archive="trivy_${version}_Linux-64bit.tar.gz"
    url="https://github.com/aquasecurity/trivy/releases/download/v${version}/${archive}"
    sha256="bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf"
    ;;
  actionlint)
    version="1.7.12"
    archive="actionlint_${version}_linux_amd64.tar.gz"
    url="https://github.com/rhysd/actionlint/releases/download/v${version}/${archive}"
    sha256="8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8"
    ;;
  tflint)
    version="0.65.0"
    archive="tflint_linux_amd64.zip"
    url="https://github.com/terraform-linters/tflint/releases/download/v${version}/${archive}"
    sha256="d4c545ed2e29d6338604b586f34f544f380f70f243aa72f7b484713835eaec61"
    ;;
  shellcheck)
    # The vendor publishes no checksum file; this digest was computed from the
    # official release asset at pin time.
    version="0.11.0"
    archive="shellcheck-v${version}.linux.x86_64.tar.xz"
    url="https://github.com/koalaman/shellcheck/releases/download/v${version}/${archive}"
    sha256="8c3be12b05d5c177a04c29e3c78ce89ac86f1595681cab149b65b97c4e227198"
    ;;
  *)
    echo "::error::Unknown tool '${tool}'. Expected gitleaks, trivy, actionlint, tflint or shellcheck." >&2
    exit 2
    ;;
esac

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

curl -fsSL --retry 3 --retry-delay 2 -o "${work_dir}/${archive}" "$url"
echo "${sha256}  ${work_dir}/${archive}" | sha256sum --check --strict -

mkdir -p "$bin_dir"
case "$archive" in
  *.tar.gz) tar -xzf "${work_dir}/${archive}" -C "$bin_dir" "$tool" ;;
  *.tar.xz) tar -xJf "${work_dir}/${archive}" -C "$bin_dir" --strip-components=1 "shellcheck-v${version}/${tool}" ;;
  *.zip)    unzip -qo "${work_dir}/${archive}" "$tool" -d "$bin_dir" ;;
esac
chmod 0755 "${bin_dir}/${tool}"

if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$bin_dir" >> "$GITHUB_PATH"
fi
echo "Installed ${tool} ${version} (checksum verified)"

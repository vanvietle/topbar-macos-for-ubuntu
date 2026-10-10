#!/usr/bin/env bash
# One-command installer:
#   curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/install.sh | bash
# Add "-s -- --dry-run" after "bash" to see what it would do without changing anything.
set -euo pipefail

REPO_URL="https://github.com/vanvietle/topbar-macos-for-ubuntu"

# run from a clone: use it directly
src="${BASH_SOURCE[0]:-}"
if [[ -n "$src" && -f "$src" ]]; then
    here="$(cd "$(dirname "$src")" && pwd)"
    if [[ -x "$here/scripts/install.sh" ]]; then
        exec "$here/scripts/install.sh" "$@"
    fi
fi

# piped from curl: download the repository into a temporary folder and run the real installer from there
command -v curl >/dev/null || { echo "curl is required:  sudo apt install curl"; exit 1; }
command -v tar  >/dev/null || { echo "tar is required:   sudo apt install tar";  exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "Downloading $REPO_URL ..."
curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar -xz -C "$tmp" --strip-components=1
"$tmp/scripts/install.sh" "$@"

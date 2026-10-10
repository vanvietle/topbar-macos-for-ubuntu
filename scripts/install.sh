#!/usr/bin/env bash
# Installs the macOS-style top bar: third-party extensions, the macbar extension, the Global Menu patch and settings.
# Usage: scripts/install.sh [--dry-run]
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"
ICON_DIR="$HOME/.local/share/icons/custom"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

# extensions installed from extensions.gnome.org (macbar controls hidetopbar itself, so it is left disabled)
UUIDS=(blur-my-shell@aunetx logomenu@aryan_k window-title-is-back@fthx just-perfection-desktop@just-perfection
       globalmenu@ShiroOSL.github.io hidetopbar@mathieu.bidon.ca)

say() { printf '\033[1m==> %s\033[0m\n' "$*"; }
run() { if (( DRY )); then printf '    [dry-run] %s\n' "$*"; else "$@"; fi; }

say "Checking the system"
command -v gnome-shell >/dev/null || { echo "GNOME Shell was not found; this needs Ubuntu with GNOME"; exit 1; }
# tool -> Ubuntu package
declare -A PKG=([gnome-extensions]=gnome-shell [dconf]=dconf-cli [gsettings]=libglib2.0-bin
                [glib-compile-schemas]=libglib2.0-bin [patch]=patch [python3]=python3 [pipx]=pipx [curl]=curl)
missing=()
for tool in "${!PKG[@]}"; do
    command -v "$tool" >/dev/null || missing+=("${PKG[$tool]}")
done
if (( ${#missing[@]} )); then
    mapfile -t missing < <(printf '%s\n' "${missing[@]}" | sort -u)
    say "Installing missing packages: ${missing[*]} (asks for your password)"
    run sudo apt-get install -y "${missing[@]}"
fi
shell_major="$(gnome-shell --version | grep -oE '[0-9]+' | head -1)"
[[ "$shell_major" == "46" ]] || echo "warning: written and tested on GNOME Shell 46 (Ubuntu 24.04); you have $shell_major"
[[ "${XDG_SESSION_TYPE:-}" == "x11" ]] || echo "warning: tested on an X11 session; on Wayland you must log out and in instead of restarting the shell"

say "Backing up the current desktop settings"
backup="$HOME/gnome-backup-$(date +%F-%H%M%S).dconf"
run bash -c "dconf dump / > '$backup'"
echo "    restore with: dconf load / < $backup"

say "Installing gext (gnome-extensions-cli)"
command -v gext >/dev/null || run pipx install gnome-extensions-cli --system-site-packages
export PATH="$PATH:$HOME/.local/bin"

say "Installing extensions from extensions.gnome.org"
# -F writes the files directly, so no confirmation dialog is needed
run gext -F install "${UUIDS[@]}"

say "Patching Global Menu (menus were rebuilt while being clicked, and key events were sent too early)"
gm="$EXT_DIR/globalmenu@ShiroOSL.github.io"
if (( DRY )); then
    echo "    [dry-run] patch -p1 -d $gm < patches/globalmenu-fix.patch"
elif patch -p1 -d "$gm" --dry-run -s < "$REPO/patches/globalmenu-fix.patch" >/dev/null 2>&1; then
    patch -p1 -d "$gm" -s < "$REPO/patches/globalmenu-fix.patch"
    echo "    patched"
else
    echo "    warning: the patch does not apply (a different Global Menu version, or it is already patched); skipped"
fi

say "Installing macbar"
run mkdir -p "$EXT_DIR/macbar@local" "$ICON_DIR"
run cp -r "$REPO/extensions/macbar@local/." "$EXT_DIR/macbar@local/"
run glib-compile-schemas "$EXT_DIR/macbar@local/schemas"
run cp "$REPO/assets/dino-trex-symbolic.svg" "$ICON_DIR/"

say "Applying settings"
if (( DRY )); then
    echo "    [dry-run] dconf load /org/gnome/shell/extensions/ < config/extensions.dconf"
else
    # the file holds paths relative to /org/gnome/shell/extensions/; @HOME@ is filled in with this user's home
    sed "s|@HOME@|$HOME|g" "$REPO/config/extensions.dconf" | dconf load /org/gnome/shell/extensions/
fi

say "Enabling extensions"
if (( DRY )); then
    echo "    [dry-run] add ${UUIDS[*]} macbar@local to enabled-extensions (hidetopbar stays off)"
else
    python3 - <<'PY'
import ast, subprocess
cur = subprocess.run(["gsettings", "get", "org.gnome.shell", "enabled-extensions"], capture_output=True, text=True).stdout
lst = ast.literal_eval(cur.replace("@as ", ""))
want = ["blur-my-shell@aunetx", "logomenu@aryan_k", "window-title-is-back@fthx", "just-perfection-desktop@just-perfection",
        "globalmenu@ShiroOSL.github.io", "macbar@local"]
for u in want:
    if u not in lst:
        lst.append(u)
lst = [u for u in lst if u != "hidetopbar@mathieu.bidon.ca"]
subprocess.run(["gsettings", "set", "org.gnome.shell", "enabled-extensions", str(lst)], check=True)
PY
fi

say "Done"
echo "Restart GNOME Shell to load everything: press Alt+F2, type r, press Enter (X11), or log out and back in."
echo "Then click the screen icon (left of the cog) on the right of the bar to choose Light / Dark / Transparent and auto-hide."

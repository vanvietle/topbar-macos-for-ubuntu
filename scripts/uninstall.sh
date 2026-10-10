#!/usr/bin/env bash
# Removes macbar and turns the extensions off. Your old settings are in the ~/gnome-backup-*.dconf file made by install.sh.
set -euo pipefail
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"

for u in macbar@local hidetopbar@mathieu.bidon.ca globalmenu@ShiroOSL.github.io blur-my-shell@aunetx logomenu@aryan_k \
         window-title-is-back@fthx just-perfection-desktop@just-perfection; do
    gnome-extensions disable "$u" 2>/dev/null || true
done
rm -rf "$EXT_DIR/macbar@local" "$HOME/.local/share/icons/custom/dino-trex-symbolic.svg" "$HOME/.cache/macbar"
dconf reset -f /org/gnome/shell/extensions/macbar/

echo "macbar removed and the extensions disabled."
echo "The other extensions are still installed (remove them with the Extension Manager if you want)."
echo "To go back to your earlier settings:  dconf load / < ~/gnome-backup-<date>.dconf"
echo "Restart GNOME Shell: Alt+F2, r, Enter (X11), or log out and back in."

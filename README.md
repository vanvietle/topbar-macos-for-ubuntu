# topbar-macos-for-ubuntu

🇬🇧 English · 🇻🇳 [Tiếng Việt](README.vi.md)

Turns the Ubuntu top bar (GNOME Shell 46) into a macOS-style menu bar: frosted transparent background, a logo on the left,
File / Edit / View / Window / Help menus for the focused app, and thin-line status icons on the right.

It is one custom extension (`macbar`) plus ready-made settings for six extensions from extensions.gnome.org.

> **Tested on:** Ubuntu 24.04, GNOME Shell 46, an **X11** session, on a single machine. Not tested on Wayland or other machines.

## Install (one command)

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/install.sh | bash
```

It needs an internet connection and asks for your `sudo` password only if a system package is missing. When it finishes,
restart GNOME Shell: press **`Alt+F2`, type `r`, press Enter** (X11), or log out and back in.

**Want to look first?** See what it would do without changing anything:

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/install.sh | bash -s -- --dry-run
```

Or clone the repository and read the scripts before running them:

```bash
git clone https://github.com/vanvietle/topbar-macos-for-ubuntu.git
cd topbar-macos-for-ubuntu
./install.sh --dry-run
./install.sh
```

### What the installer does

1. Installs missing system packages (`pipx`, `dconf-cli`, `patch`, ...).
2. Saves your current desktop settings to `~/gnome-backup-<date>.dconf`.
3. Installs six extensions from extensions.gnome.org with `gext`.
4. Applies a small patch to Global Menu (see below), copies `macbar`, loads the settings, and enables everything.

## Features

**Left:** T-Rex logo, app name (bold), File / Edit / View / Go / Window / Help menus (global menu), app icon and window title.

**Right (left to right):** user name, Vietnamese flag, input language, airplane mode, bluetooth, volume, wifi, battery with %,
Control Center, top-bar settings, a cog that opens Settings, and the clock (`Sun 11 Oct  03:28`).

- Icons are drawn with Cairo: three-level wifi, three-wave speaker, bluetooth, battery with a bolt while charging
  (green when charging, red at 20% or less).
- Only clickable icons have a hover; all hover pills are the same size. Wifi, bluetooth and volume are dimmed with a thin
  slash when off, and a click toggles them. Turning the volume back on at near-zero sets it to 80%.
- **Top-bar settings button** (the screen icon with a filled top bar): choose **Light / Dark / Transparent**, pick any
  text and icon colour for Transparent mode (swatches, hex box, RGB sliders), and set **auto-hide** (Off / Smart / Always).
- **User name:** click for the account details and **Log Out** (with a confirmation dialog).
- An open menu stays open while the pointer moves over other bar buttons.
- The clock is always at the far right and shows the date as weekday, day, month whatever the system locale is.

## Uninstall / restore

One command (it removes `macbar` and turns the extensions off):

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/scripts/uninstall.sh | bash
```

To go back to your earlier settings, load the backup the installer made:

```bash
dconf load / < ~/gnome-backup-<date>.dconf
```

Then restart the shell (`Alt+F2`, `r`, Enter). If the bar disappears after using auto-hide:
`gnome-extensions disable hidetopbar@mathieu.bidon.ca`, then `Alt+F2`, `r`.

## Layout of this repository

| Path | What it is |
|---|---|
| `install.sh` | the one-command installer (downloads the repo, then runs `scripts/install.sh`) |
| `scripts/` | `install.sh` (full installer), `uninstall.sh` |
| `extensions/macbar@local/` | the custom extension (JavaScript, GNOME Shell 46) |
| `patches/globalmenu-fix.patch` | patch for Global Menu: menus were rebuilt while being clicked, and key events were sent too early |
| `config/extensions.dconf` | settings for the extensions (default: Dark mode, white text, auto-hide off) |
| `assets/` | the T-Rex icon |

## Good to know

- After changing `macbar`'s code you must restart the shell (`Alt+F2`, `r`) to load the new code; toggling the extension is not enough.
- Global Menu does not read an app's real menus. It sends generic shortcuts (Ctrl+C, Ctrl+V, ...), so some items do nothing in some apps.
- If extensions.gnome.org ships a newer Global Menu, the patch may no longer apply (the installer says so and skips it).
- The "wifi off" slash has not been tried on a real machine, because turning wifi off cuts the developer's connection.
- Wayland is not supported yet.

License: MIT (see `LICENSE`). Third-party material: see `NOTICE.md`.

# Third-party material

## Icon
`assets/dino-trex-symbolic.svg` is the **t-rex** icon from [Material Design Icons](https://pictogrammers.com/library/mdi/)
(Pictogrammers), licensed under the Apache License 2.0. The only change is the fill colour and size attributes.

## Extensions installed from extensions.gnome.org (not copied into this repository)
| Extension | Author | Used for |
|---|---|---|
| Blur my Shell (`blur-my-shell@aunetx`) | aunetx | frosted / transparent top bar |
| Logo Menu (`logomenu@aryan_k`) | Aryan Kaushik | logo at the left of the bar |
| Window Title Is Back (`window-title-is-back@fthx`) | fthx | app icon and name of the focused window |
| Just Perfection (`just-perfection-desktop@just-perfection`) | JustPerfection | hides Activities, clock position, spacing |
| Global Menu for GNOME (`globalmenu@ShiroOSL.github.io`) | ShiroOSL | File / Edit / View / Window / Help menus |
| Hide Top Bar (`hidetopbar@mathieu.bidon.ca`) | Mathieu Bidon | auto-hide |

Each keeps its own licence. `patches/globalmenu-fix.patch` is a two-hunk patch against Global Menu v15 and contains
a few lines of that extension's code as context; check the upstream licence before redistributing it elsewhere.

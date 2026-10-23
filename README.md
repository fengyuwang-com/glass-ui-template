# Glass UI Template

Open source glass UI template inspired by the macOS 26 design language — translucent sidebar and toolbar, layered wallpaper background, calm tokens, restrained motion.

Zero build. Pure HTML / CSS / JS. Open `index.html` directly (`file://` works). No network requests, no telemetry, no backend required. All demo content is fictitious.

## Files

- `index.html` — three demo pages: components, design tokens, wallpaper.
- `source.css` — glass material, layout, navigation, dialogs, forms, responsive breakpoints.
- `styles.css` — template-level variables, cards, toasts, gallery.
- `components.js` — theme, hash navigation, menus, dialogs, toasts, tabs, form validation, command-K search.
- `wallpaper.js` — local wallpaper library (IndexedDB + settings persistence, offline only).

## Quick start

1. Double-click `index.html`, or use File → Open in a browser.
2. No server, no install, no internet needed.
3. Importing wallpaper stays in your browser's IndexedDB (`glass-ui-template` / `glass-ui-wallpaper` keys). If IndexedDB is unavailable under `file://`, it falls back to memory and says so.

## Design notes

- Single-layer glass chrome over content; wallpaper → blur → tint → content → overlays.
- Semantic color tokens (`--accent`, `--text`, `--surface`, `--sep` …), system font stack, no remote fonts.
- Breakpoints at 600px / 900px plus short-viewport handling; `prefers-reduced-transparency`, `prefers-contrast`, `forced-colors`, and `prefers-reduced-motion` fallbacks included.
- Dialogs trap focus, close on Escape, and restore focus; toasts are capped and announced via `aria-live`.

## License

MIT — see `LICENSE`.

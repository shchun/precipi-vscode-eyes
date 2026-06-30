# Eyes

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/precipi.eyes?label=VS%20Marketplace&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=precipi.eyes)
[![Open VSX](https://img.shields.io/open-vsx/v/precipi/eyes?label=Open%20VSX&color=a60ee5)](https://open-vsx.org/extension/precipi/eyes)

A pair of googly eyes that live in VS Code and watch what you're doing —
blinking on their own and acting surprised when you click them. Inspired by
[tonybaloney/vscode-pets](https://github.com/tonybaloney/vscode-pets).

![Eyes following the cursor and reacting with surprise](media/demo.gif)

> Note: a webview can't read the OS cursor outside its own area, so the eyes
> track the **real mouse while it's over the Eyes view**, and otherwise look
> toward your **text cursor (caret)** in the active editor.

## Features

- 👀 Follow the mouse while it's over the view; otherwise glance toward where
  you're typing in the editor.
- 😌 Random natural blinks (sometimes a single-eye wink).
- 😲 Click the eyes (or run **Eyes: Surprise!**) for a surprised reaction
  with a shake, an `!?` mark and a sweat drop.
- 🎨 Blends into your color theme — the background, eyelids and outline adapt to
  light and dark themes automatically.

## Install

- **VS Code / Cursor**: Extensions → search **"Eyes"** (publisher `precipi`), or
  [install from the Marketplace](https://marketplace.visualstudio.com/items?itemName=precipi.eyes).
- **VSCodium / Gitpod / other Open VSX editors**:
  [install from Open VSX](https://open-vsx.org/extension/precipi/eyes).
- **From a `.vsix`**: `code --install-extension eyes-<version>.vsix`, or
  Extensions → `…` → **Install from VSIX…**.

## Usage

The eyes live in the **Explorer** sidebar by default, so they're visible as soon
as the extension loads — no extra icon to click. Drag the **Eyes** view wherever
you like (up to the top of the Explorer, another sidebar, or the Panel) and it
auto-scales to fit.

Commands (Command Palette → `Ctrl/Cmd+Shift+P`):

- **Eyes: Show** — reveal/focus the Eyes view.
- **Eyes: Surprise!** — make the eyes react.

## Run / Develop

This is a zero-build extension (plain JavaScript — no compile step):

1. Open this folder in VS Code.
2. Press **F5** (`Run Eyes Extension`) to launch an Extension Development Host.
3. In the new window, the **Eyes** view shows up in the Explorer sidebar.

Run the integration tests (downloads a throwaway VS Code on first run):

```sh
npm install
npm test
```

## Package / Deploy (local)

```sh
npm run package   # build the .vsix
npm run deploy    # build + (re)install into your local VS Code
```

## Release / Publish

The extension is published to both the **VS Marketplace** and **Open VSX**.
Tokens live in a git-ignored `.env` (`VSCE_PAT`, `OVSX_PAT`) and are loaded into
the shell before publishing — they are excluded from the package and the repo.

```sh
# 1) bump "version" in package.json (a version can only be published once)
# 2) load tokens from .env (never commit them)
set -a; . ./.env; set +a

# 3) VS Marketplace
npx @vscode/vsce publish

# 4) Open VSX (build a .vsix, then upload it)
npx @vscode/vsce package
npx ovsx publish eyes-<version>.vsix -p "$OVSX_PAT"
```

One-time setup (already done): a `precipi` publisher on the Marketplace, a
`precipi` namespace on Open VSX (`npx ovsx create-namespace precipi`), and a
signed Eclipse Open VSX Publisher Agreement.

## Project layout

| Path                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `extension.js`        | Extension entry: registers the webview view + caret gaze. |
| `media/eyes.js`       | The eyes animation (vanilla DOM + requestAnimationFrame). |
| `media/eyes-icon.svg` | Eyes view icon (shown in the Explorer).                  |
| `media/icon.png`      | Marketplace gallery icon.                               |
| `test/`               | `@vscode/test-cli` integration + pure-logic tests.       |
| `Eyes Tall.html`      | The original standalone prototype (not shipped).        |

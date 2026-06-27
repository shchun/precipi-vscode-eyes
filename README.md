# Eyes

A pair of googly eyes that live in VS Code and watch what you're doing —
blinking on their own and acting surprised when you click them. Inspired by
[tonybaloney/vscode-pets](https://github.com/tonybaloney/vscode-pets).

> Note: a webview can't read the OS cursor outside its own area, so the eyes
> track the **real mouse while it's over the Eyes view**, and otherwise look
> toward your **text cursor (caret)** in the active editor.

## Features

- 👀 Follow the mouse while it's over the view; otherwise glance toward where
  you're typing in the editor.
- 😌 Random natural blinks (sometimes a single-eye wink).
- 😲 Click the eyes (or run **Eyes: Surprise!**) for a surprised reaction
  with a shake, an `!?` mark and a sweat drop.

## Usage

The eyes appear in the **Activity Bar** (the icon strip on the left) under the
**Eyes** icon. Click it to open the view. You can drag the view to the Panel or
the secondary sidebar if you prefer — it auto-scales to fit.

Commands (Command Palette → `Ctrl/Cmd+Shift+P`):

- **Eyes: Show** — reveal/focus the Eyes view.
- **Eyes: Surprise!** — make the eyes react.

## Run / Develop

This is a zero-build extension (plain JavaScript — no compile step):

1. Open this folder in VS Code.
2. Press **F5** (`Run Eyes Extension`) to launch an Extension Development Host.
3. In the new window, open the **Eyes** view from the Activity Bar.

## Package / Deploy

```sh
npm run package   # build the .vsix
npm run deploy    # build + (re)install into your local VS Code
```

## Project layout

| Path                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `extension.js`        | Extension entry: registers the webview view + caret gaze. |
| `media/eyes.js`       | The eyes animation (vanilla DOM + requestAnimationFrame). |
| `media/eyes-icon.svg` | Activity Bar view icon.                                  |
| `media/icon.png`      | Marketplace gallery icon.                               |
| `Eyes Tall.html`      | The original standalone prototype (not shipped).        |

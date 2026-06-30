# Changelog

## 0.0.3

- **Lives in the Explorer by default.** The view now contributes to the built-in
  Explorer sidebar instead of its own Activity Bar container, so the eyes are
  visible right after install with no extra icon to click.
- **Theme-aware look.** The outer background, eyelids and eye outline now adapt
  to the active color theme — the outline lightens to a soft gray on dark themes
  so it stays visible, and the eyelids keep a warm cream so a blink reads
  naturally on any background.
- **Faster, smoother loading.** Activates on startup and keeps the webview alive
  while hidden (`retainContextWhenHidden`), so the eyes appear promptly and come
  back instantly after the view is collapsed or toggled.
- **Surprise tweak.** The sweat drop sits a little further out so it no longer
  overlaps the eye.
- **Tests.** Added a `@vscode/test-cli` integration suite plus pure-logic tests
  for the caret→gaze mapping (`npm test`).

## 0.0.2

- Added anxious (errors) and tired (idle) eye expressions.

## 0.0.1

- Initial release: googly eyes that follow the cursor/caret, blink, and react
  with surprise.

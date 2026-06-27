const vscode = require('vscode');

/**
 * Eyes — a tiny VS Code companion (inspired by tonybaloney/vscode-pets).
 * A pair of googly eyes live in a webview view in the panel area; they spring
 * toward the cursor, blink, and act surprised when clicked.
 */

class EyesViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
    this._gazeTimer = undefined;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')],
    };
    webviewView.description = 'watches where you type';
    webviewView.webview.html = this._html(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg && msg.type === 'ready') this.updateGaze();
    });
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this.updateGaze();
    });
    // Drop the reference when the view goes away so we never post to a disposed
    // webview (which throws / leaks).
    webviewView.onDidDispose(() => {
      if (this._view === webviewView) this._view = undefined;
      clearTimeout(this._gazeTimer);
    });
  }

  /** Trigger the "surprised" reaction from the extension side. */
  surprise() {
    if (this._view) {
      this._view.show?.(true);
      this._view.webview.postMessage({ type: 'surprise' });
    }
  }

  /** Coalesce frequent caret events into at most one gaze update per ~60ms. */
  scheduleGaze() {
    if (!this._view || !this._view.visible) return;
    clearTimeout(this._gazeTimer);
    this._gazeTimer = setTimeout(() => this.updateGaze(), 60);
  }

  /**
   * Tell the eyes where to look based on the active editor's caret.
   * A webview can't read the OS cursor outside its own bounds, so we approximate
   * "looking at what you're doing" from the caret position: vertical from the
   * caret's place within the visible line range, horizontal from the column.
   */
  updateGaze() {
    if (!this._view || !this._view.visible) return;
    let x = 0.6, y = 0; // default: glance toward the editor (to the right)
    const ed = vscode.window.activeTextEditor;
    if (ed && ed.visibleRanges.length) {
      const pos = ed.selection.active;
      const vr = ed.visibleRanges[0];
      const span = Math.max(1, vr.end.line - vr.start.line);
      const vfrac = clamp((pos.line - vr.start.line) / span, 0, 1);
      const xfrac = clamp(pos.character / 80, 0, 1);
      x = clamp(0.4 + xfrac * 0.55, -1, 1);
      y = clamp((vfrac - 0.5) * 1.8, -1, 1);
    }
    this._view.webview.postMessage({ type: 'look', x: x, y: y });
  }

  _html(webview) {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'eyes.js')
    );
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #efe9df; }
  </style>
  <title>Eyes</title>
</head>
<body>
  <div id="eyes-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

EyesViewProvider.viewType = 'eyes.view';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function activate(context) {
  const provider = new EyesViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(EyesViewProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('eyes.start', () => {
      // Reveal/focus the Eyes view in the panel.
      vscode.commands.executeCommand('eyes.view.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('eyes.surprise', () => provider.surprise())
  );

  // Follow the editor caret so the eyes react to activity outside their view.
  // Debounced + visibility-guarded so fast typing doesn't flood the webview.
  const refresh = () => provider.scheduleGaze();
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(refresh),
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.window.onDidChangeTextEditorVisibleRanges(refresh)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };

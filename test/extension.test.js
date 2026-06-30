const assert = require('assert');
const path = require('path');
const vscode = require('vscode');

const ext = require(path.join(__dirname, '..', 'extension.js'));

const EXT_ID = 'precipi.eyes';

suite('Eyes — activation & contributions', () => {
  test('the extension is installed in the test host', () => {
    assert.ok(vscode.extensions.getExtension(EXT_ID), 'extension not found');
  });

  test('it activates', async () => {
    const e = vscode.extensions.getExtension(EXT_ID);
    await e.activate();
    assert.strictEqual(e.isActive, true);
  });

  test('it registers the eyes.start and eyes.surprise commands', async () => {
    await vscode.extensions.getExtension(EXT_ID).activate();
    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('eyes.start'), 'eyes.start missing');
    assert.ok(cmds.includes('eyes.surprise'), 'eyes.surprise missing');
  });

  test('eyes.reactToErrors defaults to true', () => {
    const v = vscode.workspace.getConfiguration('eyes').get('reactToErrors');
    assert.strictEqual(v, true);
  });

  test('the view is contributed to the Explorer container', () => {
    const pkg = vscode.extensions.getExtension(EXT_ID).packageJSON;
    const explorerViews = (pkg.contributes.views && pkg.contributes.views.explorer) || [];
    assert.ok(
      explorerViews.some((view) => view.id === 'eyes.view'),
      'eyes.view is not contributed to the explorer container'
    );
  });
});

suite('Eyes — computeGaze (pure logic)', () => {
  const { computeGaze, clamp } = ext;

  test('caret at the top of the viewport looks up', () => {
    const g = computeGaze({ line: 0, firstLine: 0, lastLine: 20, character: 0, lineLen: 0 });
    assert.ok(g.y < 0, `expected upward gaze, got y=${g.y}`);
  });

  test('caret at the bottom of the viewport looks down', () => {
    const g = computeGaze({ line: 20, firstLine: 0, lastLine: 20, character: 0, lineLen: 0 });
    assert.ok(g.y > 0, `expected downward gaze, got y=${g.y}`);
  });

  test('caret in the vertical middle is roughly centered', () => {
    const g = computeGaze({ line: 10, firstLine: 0, lastLine: 20, character: 0, lineLen: 0 });
    assert.ok(Math.abs(g.y) < 1e-9, `expected centered gaze, got y=${g.y}`);
  });

  test('column maps the horizontal gaze from 0.15 to 0.9', () => {
    const start = computeGaze({ line: 0, firstLine: 0, lastLine: 1, character: 0, lineLen: 100 });
    const end = computeGaze({ line: 0, firstLine: 0, lastLine: 1, character: 100, lineLen: 100 });
    assert.ok(Math.abs(start.x - 0.15) < 1e-9, `start x=${start.x}`);
    assert.ok(Math.abs(end.x - 0.9) < 1e-9, `end x=${end.x}`);
  });

  test('short lines do not saturate horizontally (column floor of 24)', () => {
    // character 10 on a 10-char line: divided by max(24, 10) = 24, not 10.
    const g = computeGaze({ line: 0, firstLine: 0, lastLine: 1, character: 10, lineLen: 10 });
    const expected = clamp(0.15 + (10 / 24) * 0.75, -1, 1);
    assert.ok(Math.abs(g.x - expected) < 1e-9, `x=${g.x}, expected ${expected}`);
  });

  test('output always stays within [-1, 1]', () => {
    const g = computeGaze({ line: 9999, firstLine: 0, lastLine: 1, character: 9999, lineLen: 5 });
    assert.ok(g.x >= -1 && g.x <= 1, `x out of range: ${g.x}`);
    assert.ok(g.y >= -1 && g.y <= 1, `y out of range: ${g.y}`);
  });
});

// Render QA stills for one composition at chosen times, then (optionally) a contact sheet via Python.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [id, ...times] = process.argv.slice(2);
const root = path.resolve(import.meta.dirname, '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => {}});
const comp = await selectComposition({serveUrl, id, browserExecutable: BROWSER});
fs.mkdirSync(path.join(root, 'out/frames'), {recursive: true});
for (const t of times) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(parseFloat(t) * comp.fps));
  const output = path.join(root, `out/frames/${id}_${String(t).replace('.', '_')}.jpg`);
  await renderStill({composition: comp, serveUrl, output, frame, browserExecutable: BROWSER, imageFormat: 'jpeg', jpegQuality: 88});
  console.log('still', id, t, '→', path.relative(root, output));
}

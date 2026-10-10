// Safe-zone lint: renders the DOM only (no pixels), logs the rectangle of every critical element per sampled frame.
// Usage: node scripts/lint.mjs spec.json out.json [--style=apple|data|paper|mix] [--every=3]
import {bundle} from '@remotion/bundler';
import {renderFrames, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (k) => (args.find((a) => a.startsWith(`--${k}=`)) ?? '').split('=')[1];
const [specPath, outPath] = args.filter((a) => !a.startsWith('--'));
const root = path.resolve(import.meta.dirname, '..');
const BROWSER = process.env.CHROMIUM_BIN ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
if (opt('style')) spec.style = opt('style');
spec.captionSkin = spec.style === 'mix' ? 'house' : 'pack';
spec.lint = true;
const every = parseInt(opt('every') ?? '3', 10);

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => {}});
const composition = await selectComposition({serveUrl, id: 'Video', browserExecutable: BROWSER, inputProps: spec});
const records = [], errors = [];
await renderFrames({
  composition, serveUrl, inputProps: spec, imageFormat: 'none', everyNthFrame: every, concurrency: Math.min(4, os.cpus().length), browserExecutable: BROWSER,
  outputDir: null, onFrameUpdate: () => {},
  onBrowserLog: (log) => {
    const t = log.text ?? '';
    if (t.startsWith('LINT|')) records.push(JSON.parse(t.slice(5)));
    else if (t.startsWith('LINTERR|')) errors.push(t.slice(8));
  },
});
records.sort((a, b) => a.f - b.f);
fs.writeFileSync(outPath, JSON.stringify({fps: composition.fps, style: spec.style, frames: records, errors: [...new Set(errors)]}));
console.log(`lint frames=${records.length} errors=${new Set(errors).size} → ${outPath}`);

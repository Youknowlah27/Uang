// Render the Video composition for a resolved spec.json (silent; audio is muxed by the Python pipeline).
// Usage: node scripts/render_spec.mjs spec.json out.mp4 [--style=apple|data|paper|mix] [--crf=20]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const [specPath, outPath] = args.filter((a) => !a.startsWith('--'));
const root = path.resolve(import.meta.dirname, '..');
const BROWSER = process.env.CHROMIUM_BIN ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
if (opt('style', '')) spec.style = opt('style', '');
spec.captionSkin = spec.style === 'mix' ? 'house' : 'pack';
spec.lint = false;

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => {}});
const composition = await selectComposition({serveUrl, id: 'Video', browserExecutable: BROWSER, inputProps: spec});
fs.mkdirSync(path.dirname(outPath), {recursive: true});
let last = -1;
const t0 = Date.now();
await renderMedia({
  composition, serveUrl, outputLocation: outPath, codec: 'h264', crf: parseInt(opt('crf', '20'), 10), pixelFormat: 'yuv420p', inputProps: spec,
  browserExecutable: BROWSER, concurrency: Math.min(4, os.cpus().length), overwrite: true, muted: true,
  onProgress: ({progress}) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== last) { last = pct; console.log(`render ${pct}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
  },
});
console.log(`done ${outPath} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

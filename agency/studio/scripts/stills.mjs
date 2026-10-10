// Render QA stills of the Video composition. Usage: node scripts/stills.mjs spec.json out_prefix t1 t2 ... [--style=apple|data|paper|mix]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const style = (args.find((a) => a.startsWith('--style=')) ?? '').split('=')[1];
const [specPath, prefix, ...times] = args.filter((a) => !a.startsWith('--'));
const root = path.resolve(import.meta.dirname, '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
if (style) spec.style = style;
spec.captionSkin = spec.style === 'mix' ? 'house' : 'pack';
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => {}});
const comp = await selectComposition({serveUrl, id: 'Video', browserExecutable: BROWSER, inputProps: spec});
fs.mkdirSync(path.dirname(prefix), {recursive: true});
for (const t of times) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(parseFloat(t) * comp.fps));
  const output = `${prefix}_${String(t).replace('.', '_')}.jpg`;
  await renderStill({composition: comp, serveUrl, output, frame, browserExecutable: BROWSER, imageFormat: 'jpeg', jpegQuality: 88, inputProps: spec});
  console.log('still', output);
}

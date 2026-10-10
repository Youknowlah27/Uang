// Render every style pack to MP4 (1080x1920, 30fps, H.264 + AAC). Usage: node scripts/render_all.mjs [Apple Data Paper]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const NAMES = {Apple: 'style1_apple_minimal', Data: 'style2_data_journalism', Paper: 'style3_paper_cutout'};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(NAMES);

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => {}});
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
for (const id of ids) {
  const comp = await selectComposition({serveUrl, id, browserExecutable: BROWSER});
  const outputLocation = path.join(root, 'out', `${NAMES[id]}.mp4`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition: comp, serveUrl, outputLocation, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', audioBitrate: '192k',
    browserExecutable: BROWSER, concurrency: 4, overwrite: true,
    onProgress: ({progress}) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; console.log(`[${id}] ${pct}%  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); }
    },
  });
  console.log(`[${id}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(root, outputLocation)}`);
}

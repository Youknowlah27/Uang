import React from 'react';
import {useCurrentFrame} from 'remotion';
import {useSpec} from './timeline';

type Item = {k: 'text' | 'obj'; t: string; x0: number; y0: number; x1: number; y1: number; o: number};

const effectiveOpacity = (el: Element | null): number => {
  let o = 1;
  while (el) {
    const cs = getComputedStyle(el as HTMLElement);
    o *= parseFloat(cs.opacity || '1');
    if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
    el = el.parentElement;
  }
  return o;
};
const inDecor = (el: Element | null) => !!el?.closest('[data-decor]');

const collect = (): Item[] => {
  const items: Item[] = [];
  const root = document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const txt = (n.textContent ?? '').trim();
    const el = n.parentElement;
    if (!txt || !el || inDecor(el) || el.closest('svg') || el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
    const o = effectiveOpacity(el);
    if (o < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    items.push({k: 'text', t: txt.slice(0, 28), x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom), o: +o.toFixed(2)});
  }
  document.querySelectorAll('[data-critical]').forEach((el) => {
    if (inDecor(el)) return;
    const o = effectiveOpacity(el);
    if (o < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    items.push({k: 'obj', t: String(el.getAttribute('data-critical')), x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom), o: +o.toFixed(2)});
  });
  return items;
};

/** When spec.lint is true, logs every critical element's rectangle (text + mascot + icons) per sampled frame.
 *  The Python reviewer parses these console lines ("LINT|{json}") to enforce the safe zones. */
export const LintProbe: React.FC = () => {
  const frame = useCurrentFrame();
  const spec = useSpec();
  React.useLayoutEffect(() => {
    if (!spec.lint) return;
    console.log('LINT|' + JSON.stringify({f: frame, items: collect()}));
  });
  return null;
};

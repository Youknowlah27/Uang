import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

const FACES: {family: string; file: string; weight: string; style?: string}[] = [
  {family: 'Inter', file: 'Inter-Regular.otf', weight: '400'},
  {family: 'Inter', file: 'Inter-Medium.otf', weight: '500'},
  {family: 'Inter', file: 'Inter-SemiBold.otf', weight: '600'},
  {family: 'Inter', file: 'Inter-Bold.otf', weight: '700'},
  {family: 'Inter', file: 'Inter-ExtraBold.otf', weight: '800'},
  {family: 'Inter', file: 'Inter-Black.otf', weight: '900'},
  {family: 'InterDisplay', file: 'InterDisplay-SemiBold.otf', weight: '600'},
  {family: 'InterDisplay', file: 'InterDisplay-Bold.otf', weight: '700'},
  {family: 'InterDisplay', file: 'InterDisplay-ExtraBold.otf', weight: '800'},
  {family: 'Playfair', file: 'playfair-display-latin-700-normal.woff2', weight: '700'},
  {family: 'Playfair', file: 'playfair-display-latin-900-normal.woff2', weight: '900'},
  {family: 'Playfair', file: 'playfair-display-latin-700-italic.woff2', weight: '700', style: 'italic'},
  {family: 'Bowlby', file: 'bowlby-one-latin-400-normal.woff2', weight: '400'},
  {family: 'Caveat', file: 'caveat-latin-700-normal.woff2', weight: '700'},
  {family: 'JBMono', file: 'jetbrains-mono-latin-500-normal.woff2', weight: '500'},
  {family: 'JBMono', file: 'jetbrains-mono-latin-700-normal.woff2', weight: '700'},
];

/** Blocks the render until every font face is decoded. */
export const FontLoader: React.FC = () => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    Promise.all(
      FACES.map(async (f) => {
        const ff = new FontFace(f.family, `url(${staticFile('fonts/' + f.file)})`, {weight: f.weight, style: f.style ?? 'normal'});
        await ff.load();
        document.fonts.add(ff);
      }),
    )
      .catch((e) => console.error('font load failed', e))
      .finally(() => continueRender(handle));
  }, [handle]);
  return null;
};

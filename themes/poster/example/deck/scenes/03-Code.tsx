import { Scene, useScene } from 'beatdeck';
import { Mono, Say, Stamp } from '../poster';

function Code_() {
  const { here, b } = useScene();
  return (
    <>
      <Stamp on={here} text="code on a sheet" />
      <Say on={here && b === 0} out={here && b > 0} text="Sheets read the same on every tone." />
      <Mono on={here && b === 0} out={here && b > 0} x={150} y={420} size={32} lines={[
        '$ node tools/contrast.mjs',
        'all 126 text pairs ≥ 4.5:1 (2 editions × 9 tones)',
      ]} />
      <Say on={here && b === 1} text="One sentence carries the beat." size={120} y={380} />
    </>
  );
}
export const Code = () => <Scene index={2}><Code_ /></Scene>;

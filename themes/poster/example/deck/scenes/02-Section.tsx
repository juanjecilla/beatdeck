import { Scene, useScene } from 'beatdeck';
import { BigTitle } from '../poster';

function Section_() {
  const { here } = useScene();
  return <BigTitle on={here} title="Section" line="Every scene owns a full-bleed colour." />;
}
export const Section = () => <Scene index={1}><Section_ /></Scene>;

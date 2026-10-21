import { Reveal, Scene, useScene } from 'beatdeck';
import { strings as s } from '../i18n';

function End_() {
  const { here } = useScene();
  return (
    <Reveal on={here} x={160} y={380}>
      <div className="t-statement" style={{ fontSize: 220 }}>{s.end.questions}<span style={{ color: 'var(--accent)' }}>?</span></div>
    </Reveal>
  );
}

/** 03 END — questions. */
export const End = () => <Scene index={2}><End_ /></Scene>;

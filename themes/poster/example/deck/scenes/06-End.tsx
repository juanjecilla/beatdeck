import { Reveal, Scene, useScene } from 'beatdeck';

function End_() {
  const { here } = useScene();
  return (
    <Reveal on={here} x={160} y={380}>
      <div className="t-statement" style={{ fontSize: 220 }}>Questions<span style={{ color: 'var(--accent)' }}>?</span></div>
    </Reveal>
  );
}
export const End = () => <Scene index={5}><End_ /></Scene>;

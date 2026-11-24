import { Reveal, Scene, useScene } from 'beatdeck';

function Night_() {
  const { here } = useScene();
  return (
    <Reveal on={here} x={150} y={400}>
      <div className="t-statement" style={{ fontSize: 170 }}>Close your eyes.</div>
    </Reveal>
  );
}
export const Night = () => <Scene index={4}><Night_ /></Scene>;

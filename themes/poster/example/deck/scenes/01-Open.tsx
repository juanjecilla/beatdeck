import { Reveal, Scene, useScene } from 'beatdeck';
import { config } from '../deck.config';

function Open_() {
  const { here } = useScene();
  return (
    <>
      <Reveal on={here} x={168} y={250}><div className="t-eyebrow">// {config.subtitle}</div></Reveal>
      <Reveal on={here} x={150} y={330} delay={120} ms={1100}>
        <h1 className="t-statement" style={{ fontSize: 190, margin: 0 }}>Poster<br />theme</h1>
      </Reveal>
      <Reveal on={here} x={168} y={820} delay={400}><div className="t-meta" style={{ fontSize: 26 }}>{config.author}</div></Reveal>
    </>
  );
}
export const Open = () => <Scene index={0}><Open_ /></Scene>;

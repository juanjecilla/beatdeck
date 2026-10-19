import { Reveal, Scene, useScene } from 'beatdeck';
import { config } from '../deck.config';
import { strings as s } from '../i18n';

function Open_() {
  const { here, b } = useScene();
  const title = here && b === 1;
  return (
    <>
      <div style={{ position: 'absolute', left: 952, top: 532, width: 16, height: 16, background: 'var(--accent)', opacity: here && b === 0 ? 1 : 0, transition: 'opacity 400ms' }} />
      <Reveal on={title} x={168} y={318}>
        <div className="t-eyebrow">// {s.subtitle}</div>
      </Reveal>
      <Reveal on={title} x={150} y={400} delay={120} ms={1100}>
        <div className="t-statement" style={{ fontSize: 128, width: 1500 }}>{s.title}</div>
      </Reveal>
      <Reveal on={title} x={168} y={880} delay={400}>
        <div className="t-meta" style={{ fontSize: 22 }}>{config.author}</div>
      </Reveal>
    </>
  );
}

/** 01 OPEN — standby, then the title. */
export const Open = () => <Scene index={0}><Open_ /></Scene>;

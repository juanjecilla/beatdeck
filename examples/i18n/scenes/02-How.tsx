import { Reveal, Scene, useScene } from 'beatdeck';
import { strings as s } from '../i18n';

function How_() {
  const { here, b } = useScene();
  return (
    <>
      <Reveal on={here} x={150} y={150}>
        <div className="t-statement" style={{ fontSize: 120, width: 1600 }}>{s.how.heading}</div>
      </Reveal>
      {s.how.steps.map((step, i) => (
        <Reveal key={i} on={here && b >= 1 + i} x={160} y={460 + i * 130}>
          <div className="t-editorial" style={{ fontSize: 56, width: 1500 }}>
            <span style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>{'  '}{step}
          </div>
        </Reveal>
      ))}
    </>
  );
}

/** 02 HOW — the heading, then the three steps, one per click. */
export const How = () => <Scene index={1}><How_ /></Scene>;

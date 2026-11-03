import { Scene, useScene } from 'beatdeck';

const at = (on: boolean) => ({ position: 'absolute' as const, opacity: on ? 1 : 0 });

function Fixture_() {
  const { here, b } = useScene();
  const on = (n: number) => here && b === n;
  return (
    <>
      <div style={{ ...at(on(0)), left: 200, top: 400, fontSize: 120, fontWeight: 600 }}>Plain page</div>

      <div style={{ ...at(on(1)), left: 560, top: 300, width: 800, height: 400, background: 'var(--bg)', borderRadius: 24, boxShadow: '0 40px 120px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.15)' }} />
      <div style={{ ...at(on(1)), left: 640, top: 460, fontSize: 96, fontWeight: 600 }}>Shadow card</div>

      <style>{'@keyframes fx-slide{from{transform:translateX(0)}to{transform:translateX(900px)}}'}</style>
      <div style={{ ...at(on(2)), left: 200, top: 300, width: 200, height: 200, background: 'var(--accent)', animation: 'fx-slide 1.2s linear infinite alternate' }} />
      <div style={{ ...at(on(2)), left: 200, top: 700, fontSize: 96, fontWeight: 600 }}>Ambient motion</div>

      <div style={{ ...at(on(3)), left: 0, top: 0, width: 1920, height: 1080, background: 'linear-gradient(120deg,#e11d48,#2563eb 50%,#16a34a)' }} />
      <div style={{ ...at(on(3)), left: 400, top: 250, width: 1120, height: 580, backdropFilter: 'blur(40px) saturate(1.6)', background: 'rgba(255,255,255,.12)', borderRadius: 32 }} />
      <div style={{ ...at(on(3)), left: 480, top: 480, fontSize: 96, fontWeight: 600 }}>Blurred glass</div>
    </>
  );
}

export const Fixture = () => <Scene index={0}><Fixture_ /></Scene>;

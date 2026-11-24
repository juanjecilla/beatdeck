import { Scene, useScene } from 'beatdeck';
import { Say, Shot, Stamp } from '../poster';
import screen from '../assets/screen.svg';

function Screens_() {
  const { here } = useScene();
  return (
    <>
      <Stamp on={here} text="a screenshot on a sheet" />
      <Say on={here} text="Images get the same sheet." />
      <Shot on={here} src={screen} alt="A wireframe of a phone screen with four coloured tiles" x={150} y={300} h={700} caption="Always write the alt text." />
    </>
  );
}
export const Screens = () => <Scene index={3}><Screens_ /></Scene>;

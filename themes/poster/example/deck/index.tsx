import { defineDeck } from 'beatdeck';
import '../themes/neutral.css';
import '../themes/poster.css';
import { LiveRegion, SrNav, StagePicture, ThemeToggle } from './a11y-kit';
import { config } from './deck.config';
import { Numeral, ToneTheme } from './poster';
import { SCENES } from './scenes';
import { Open } from './scenes/01-Open';
import { Section } from './scenes/02-Section';
import { Code } from './scenes/03-Code';
import { Screens } from './scenes/04-Screens';
import { Night } from './scenes/05-Night';
import { End } from './scenes/06-End';
import { SR } from './sr';
import { TONES } from './tones';

/** Every layer of the stage, back to front. */
function Stage() {
  return (
    <>
      <ThemeToggle />
      <ToneTheme tones={TONES} />
      <LiveRegion summaries={SR} />
      <SrNav />
      <StagePicture>
        <Numeral hideOn={[0, 4]} />
        <Open />
        <Section />
        <Code />
        <Screens />
        <Night />
        <End />
      </StagePicture>
    </>
  );
}

export default defineDeck({
  id: 'poster-theme-example',
  title: config.title,
  lang: 'en',
  scenes: SCENES,
  Stage,
  fonts: ['400 100px "Inter Variable"', '600 100px "Inter Variable"', '800 100px "Fraunces Variable"', '400 32px "JetBrains Mono Variable"'],
  qrUrl: config.qrUrl,
});

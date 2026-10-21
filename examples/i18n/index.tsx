import { defineDeck } from 'beatdeck';
import '../../themes/neutral.css';
import { config } from './deck.config';
import { strings as s } from './i18n';
import { SCENES } from './scenes';
import { Open } from './scenes/01-Open';
import { How } from './scenes/02-How';
import { End } from './scenes/03-End';

function Stage() {
  return (
    <>
      <Open />
      <How />
      <End />
    </>
  );
}

// no `lang` here: each locale's build sets it
export default defineDeck({
  id: 'beatdeck-i18n',
  title: s.title,
  scenes: SCENES,
  Stage,
  fonts: ['400 100px "Inter Variable"', '600 100px "Inter Variable"', '400 32px "JetBrains Mono Variable"'],
  qrUrl: config.qrUrl,
  audit: { safeMargin: config.safeMargin },
});

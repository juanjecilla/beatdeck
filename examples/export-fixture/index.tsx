import { defineDeck } from 'beatdeck';
import '../../themes/neutral.css';
import { config } from './deck.config';
import { SCENES } from './scenes';
import { Fixture } from './scenes/01-Fixture';

export default defineDeck({
  id: 'export-fixture',
  title: config.title,
  lang: 'en',
  scenes: SCENES,
  Stage: () => <Fixture />,
  fonts: ['400 100px "Inter Variable"', '600 100px "Inter Variable"'],
  qrUrl: config.qrUrl,
  audit: { safeMargin: false },
});

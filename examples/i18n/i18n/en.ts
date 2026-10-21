/** The source table. No `as const`: the other locales are checked against its type. */
export const strings = {
  title: 'One talk, two languages',
  subtitle: 'beatdeck string tables',
  open: { standby: 'Calm screen while people sit down. The first click starts the talk.' },
  how: {
    heading: 'Text lives in a table.',
    steps: ['One string table per language.', 'One beat map for all of them.', 'One build per language.'],
    note: 'Say the three steps one at a time, one click each.',
  },
  end: { questions: 'Questions', note: 'Leave this on screen while people ask.' },
};
export type Strings = typeof strings;

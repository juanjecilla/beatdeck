import type { SceneDef } from 'beatdeck';
import { strings as s } from './i18n';

/** The beat map is shared by every locale: ids, titles and beat names are the operator's vocabulary. Notes are localized. */
export const SCENES: SceneDef[] = [
  { id: '01', title: 'OPEN', beats: [{ name: 'standby', note: s.open.standby }, { name: 'title' }] },
  { id: '02', title: 'HOW', beats: [{ name: 'heading', note: s.how.note }, { name: 'one' }, { name: 'two' }, { name: 'three' }] },
  { id: '03', title: 'END', beats: [{ name: 'questions', note: s.end.note }] },
];

import type { SceneDef } from 'beatdeck';

export const SCENES: SceneDef[] = [
  { id: '01', title: 'OPEN', beats: [{ name: 'title' }] },
  { id: '02', title: 'SECTION', beats: [{ name: 'title' }] },
  { id: '03', title: 'CODE', beats: [{ name: 'code' }, { name: 'say' }] },
  { id: '04', title: 'SCREENS', beats: [{ name: 'screen' }] },
  { id: '05', title: 'NIGHT', beats: [{ name: 'quote' }] },
  { id: '06', title: 'END', beats: [{ name: 'end' }] },
];

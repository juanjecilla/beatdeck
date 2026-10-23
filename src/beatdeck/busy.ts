import { gsap } from 'gsap';

/** true while any GSAP tween or finite CSS animation/transition is still running (infinite loops do not count) */
export const isBusy = (): boolean =>
  gsap.globalTimeline.getChildren(true, true, true).some((t) => t.isActive()) ||
  document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity);

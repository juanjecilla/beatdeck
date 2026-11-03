import { useEffect, useState } from 'react';
import { deck, useDeck } from '../engine';
import { isBusy } from '../busy';
import { auditFrame, coveredLine, edgeLine } from '../audit.js';

type Found = { errors: string[]; warnings: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Development only (`npm run dev`, never in a build, `?capture=1` or the presenter window): audits the beat on screen once
 * it has settled and lists what `verify` would report, so layout problems show up while designing.
 */
export default function AuditBadge() {
  const pos = useDeck((s) => ({ scene: s.scene, beat: s.beat }));
  const [found, setFound] = useState<Found | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    setFound(null);
    (async () => {
      // same rule as scripts/lib.mjs settle(): two quiet polls in a row, at least 500 ms, at most 8 s
      const start = Date.now();
      await sleep(500);
      for (let quiet = 0; live && quiet < 2 && Date.now() - start < 8000; await sleep(120)) quiet = isBusy() ? 0 : quiet + 1;
      if (!live) return;
      const r = auditFrame();
      const auto = deck.scenes[pos.scene]?.beats[pos.beat]?.auto;
      if (live) {
        setFound({
          errors: r.errors,
          warnings: [
            ...r.covered.map(coveredLine),
            ...r.edges.map(edgeLine),
            ...r.warnings,
            ...(auto ? ['auto beat: an export shows its end state only'] : []),
          ],
        });
      }
    })();
    return () => { live = false; };
  }, [pos.scene, pos.beat]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const n = found ? found.errors.length + found.warnings.length : 0;
  return (
    <div className="audit-badge mono" data-audit="off" onClick={stop} onMouseDown={stop}>
      <button type="button" className={found?.errors.length ? 'bad' : n ? 'warn' : 'ok'} onClick={() => setOpen((o) => !o)}>
        {!found ? 'auditing…' : n ? `${found.errors.length} error${found.errors.length === 1 ? '' : 's'} · ${found.warnings.length} warning${found.warnings.length === 1 ? '' : 's'}` : 'layout ok'}
      </button>
      {open && found && n > 0 && (
        <ul>
          {found.errors.map((e, i) => <li key={`e${i}`} className="bad">{e}</li>)}
          {found.warnings.map((w, i) => <li key={`w${i}`}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}

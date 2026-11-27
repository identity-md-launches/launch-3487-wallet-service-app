import { useEffect } from "react";
import { ETHERSCAN, EXPLORER, IMD_API } from "./config";
import type { SavedPrediction } from "./store";

/** Predictions paid from this browser, each followed to its swarm job. */
export function MyPredictions({ list, update }: { list: SavedPrediction[]; update: (tx: string, p: Partial<SavedPrediction>) => void }) {
  useEffect(() => {
    const pending = list.filter((p) => !p.jobId);
    if (pending.length === 0) return;
    let stop = false;
    const tick = async () => {
      for (const p of pending) {
        try {
          const r = await fetch(`${IMD_API}/intake/1/${p.tx}`);
          if (!r.ok) continue; // 404 until the network has seen the transaction
          const j = await r.json();
          const jobId = j?.entries?.[0]?.admission?.result?.jobId ?? j?.entries?.[0]?.jobId;
          if (jobId && !stop) update(p.tx, { jobId: String(jobId) });
        } catch {
          /* offline: try again on the next tick */
        }
      }
    };
    tick();
    const t = setInterval(tick, 20_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [list, update]);

  return (
    <section className="panel" aria-labelledby="mine-title">
      <h2 id="mine-title">Your predictions</h2>
      {list.length === 0 ? (
        <p className="muted">Predictions you pay for appear here with a link to their analysis.</p>
      ) : (
        <ul className="mine" aria-live="polite">
          {list.map((p) => (
            <li key={p.tx}>
              <p className="mine-match">{p.match}</p>
              <p className="muted">Your call: {p.pick}</p>
              <p className="mine-links">
                {p.jobId ? (
                  <a href={`${EXPLORER}/jobs/${p.jobId}`} target="_blank" rel="noreferrer">Read the analysis</a>
                ) : (
                  <span className="muted">Waiting for the swarm to admit the job…</span>
                )}
                <a href={`${ETHERSCAN}/tx/${p.tx}`} target="_blank" rel="noreferrer">Transaction</a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

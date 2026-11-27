import { useCallback, useEffect, useState } from "react";

export type SavedPrediction = {
  tx: `0x${string}`;
  fixtureId: string;
  match: string;
  pick: string;
  kickoff: string;
  paidAt: string;
  jobId?: string;
};

const KEY = "imd-edge:predictions:v1";

function read(): SavedPrediction[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Predictions this browser paid for, kept locally so the visitor can follow each analysis. */
export function usePredictions() {
  const [list, setList] = useState<SavedPrediction[]>(read);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setList(read());
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);
  const save = useCallback((next: SavedPrediction[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setList(next);
  }, []);
  const add = useCallback((p: SavedPrediction) => save([p, ...read().filter((x) => x.tx !== p.tx)]), [save]);
  const update = useCallback((tx: string, patch: Partial<SavedPrediction>) => save(read().map((x) => (x.tx === tx ? { ...x, ...patch } : x))), [save]);
  return { list, add, update };
}

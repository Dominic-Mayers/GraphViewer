import { setGraphState } from "./graph-state.js";

/**
 * Fetch a canonical checkpoint snapshot and install it into graph-state.
 * Returns the snapshot (handy for delta-tail computations).
 */
export async function fetchAndSetCheckpoint(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Checkpoint fetch failed: ${res.status} ${url}`);
  const snapshot = await res.json();
  setGraphState(snapshot);
  return snapshot;
}

window.fetchAndSetCheckpoint = fetchAndSetCheckpoint;

// assets/graph/transformations-with-redo-api.js
//
// Higher-level transformations API:
// - uses transformations-api.js as the graph-transformation library
// - owns undo/redo stack semantics
// - may mutate both graph state and stack state
// - never renders
//
// This module is meant to be used by:
// - Ctrl-Z / Ctrl-Y listeners
// - UI actions that should participate in history semantics
//
// transformations-api.js remains available as the plain graph-state API.

import { getGraphState, setGraphState } from "./graph-state.js";
import * as graphTransforms from "./transformations-api.js";
import { computeDelta, inverseDelta } from "./transformation-helper.js";
import { fetchJson } from "./fetch-json.js";
import UndoManager from 'undo-manager';

// ------------------------------
// Stack ownership
// ------------------------------

let undoManager = null;

/**
 * Stack-related application state.
 * This complements graph state, but is owned here.
 */
const historyState = {
  lastCheckpointUrl: null,
  tipDirty: false
};

/**
 * Initialize undo/redo stacks.
 * Phase 1 should call this once.
 *
 * @param {Object} params
 * @param {Object} params.undoManagerInstance
 * @param {string} params.initialCheckpointUrl
 */
export function initUndoRedoStacks({ undoManagerInstance, initialCheckpointUrl }) {
  undoManager = new UndoManager();

  historyState.lastCheckpointUrl = initialCheckpointUrl;
  historyState.tipDirty = false;

  undoManager.clear();

  // Initial checkpoint:
  // redo = fetch canonical initial state
  // undo = no-op
  undoManager.add({
    kind: "checkpoint",
    url: initialCheckpointUrl,
    undo: () => {},
    redo: () => fetchAndSetCheckpoint(initialCheckpointUrl)
  });
}

// ------------------------------
// Checkpoint fetch helpers
// ------------------------------

async function fetchAndSetCheckpoint(url) {
  const snapshot = await fetchJson(url);
  setGraphState(snapshot);
  return snapshot;
}

async function fetchCheckpointSnapshot(url) {
  return await fetchJson(url);
}

// ------------------------------
// Exported graph transformations
// with history semantics
// ------------------------------

/**
 * Minor transformation:
 * participates in dirty tip, but does not create a checkpoint.
 */
export async function expandGroup(groupId) {
  await graphTransforms.expandGroup(groupId);
  historyState.tipDirty = true;
}

/**
 * Minor transformation:
 * participates in dirty tip, but does not create a checkpoint.
 */
export async function collapseGroup(groupId) {
  await graphTransforms.collapseGroup(groupId);
  historyState.tipDirty = true;
}

/**
 * Minor transformation:
 * participates in dirty tip, but does not create a checkpoint.
 *
 * This wraps the plain graph transformation version.
 */
export function restrictToReachable(startNodeId) {
  graphTransforms.restrictToReachable(startNodeId);
  historyState.tipDirty = true;
}

/**
 * Example of a major transformation:
 * create a checkpoint from a deterministic URL.
 *
 * This is the pattern to use for server-cleaned checkpoints.
 */
export async function addCheckpoint(url) {
  if (!undoManager) throw new Error("Undo/redo stacks not initialized");

  const previousCommand = undoManager.getCommands().at(-1);

  undoManager.add({
    kind: "checkpoint",
    url,
    undo: () => previousCommand?.redo?.(),
    redo: () => fetchAndSetCheckpoint(url)
  });

  historyState.lastCheckpointUrl = url;
  historyState.tipDirty = false;

  await fetchAndSetCheckpoint(url);
}

/**
 * Convenience wrapper for a future server-cleaned restrictToReachable route.
 * Adjust/remove if you prefer to call addCheckpoint(url) directly.
 */
export async function restrictToReachableCheckpoint(graphId, nodeId) {
  const url = `/graph/${graphId}/${nodeId}`;
  await addCheckpoint(url);
}

/**
 * Example of a history-ignored transformation:
 * graph state changes, but it does not count as dirty
 * and does not create a checkpoint.
 *
 * Keep or remove depending on whether you want explicit ignored wrappers.
 */
export async function expandGroupIgnored(groupId) {
  await graphTransforms.expandGroup(groupId);
}

// ------------------------------
// Undo / Redo as transformations
// ------------------------------

/**
 * Undo:
 * - if redo stack is empty and the current tip is dirty,
 *   materialize a tail first
 * - then execute undo
 */
export async function undo() {
  if (!undoManager) throw new Error("Undo/redo stacks not initialized");

  const atTip = !undoManager.hasRedo();
  const atInitialCheckpoint = undoManager.getIndex() === 0;

  // Ignore undo at the initial clean state
  if (atInitialCheckpoint && !historyState.tipDirty) {
    return;
  }

  if (atTip && historyState.tipDirty) {
    await materializeTail();
    historyState.tipDirty = false;
  }

  undoManager.undo();
}

/**
 * Redo:
 * - just redo
 */
export async function redo() {
  if (!undoManager) throw new Error("Undo/redo stacks not initialized");
  undoManager.redo();
}

// ------------------------------
// Tail materialization
// ------------------------------

/**
 * Materialize:
 *   ... -> checkpointN -> tail
 *
 * Tail is created only at the dirty tip.
 * It is ephemeral and exists only for history navigation.
 *
 * Snapshot-based implementation kept here for simplicity.
 * You can switch to delta-based by uncommenting the lower block.
 */
async function materializeTail() {
  const cleanUrl = historyState.lastCheckpointUrl;
  if (!cleanUrl) {
    throw new Error("Cannot materialize tail: missing lastCheckpointUrl");
  }

  const dirtySnapshot = getGraphState();                 // D
  const cleanSnapshot = await fetchCheckpointSnapshot(cleanUrl); // C

  undoManager.add({
    kind: "tail",
    baseUrl: cleanUrl,
    undo: () => setGraphState(cleanSnapshot),
    redo: () => setGraphState(dirtySnapshot)
  });

  /*
  // Delta-based alternative:

  const delta = computeDelta(cleanSnapshot, dirtySnapshot);
  const invDelta = inverseDelta(delta, cleanSnapshot);

  undoManager.add({
    kind: "tail",
    baseUrl: cleanUrl,
    undo: () => graphTransforms.applyDelta(invDelta),
    redo: () => graphTransforms.applyDelta(delta)
  });
  */
}

// ------------------------------
// Optional debug helpers
// ------------------------------

export function getHistoryState() {
  if (typeof structuredClone === "function") {
    return structuredClone(historyState);
  }
  return JSON.parse(JSON.stringify(historyState));
}
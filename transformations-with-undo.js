// assets/graph/transformations-with-undo.js

import UndoManager from "undo-manager";
import { getGraphState, setGraphState, getGraphId } from "./graph-state.js";
import { fetchGraph } from "./graph-server-api.js";
import { getServerStateAndSave } from "./transformations-api.js";
import { restrictToReachable } from "./transformations-api.js";

// Module-owned undo manager
const undoManager = new UndoManager();
undoManager.setCallback(() => {
  console.log("callback fired");
});

/**
 * Add a synthetic checkpoint command to the undo manager.
 *
 * The new checkpoint represents the clean canonical state fetched from `url`.
 * Its undo replays the previous checkpoint's redo command.
 *
 * Assumptions:
 * - The undo stack has already been initialized with an initial checkpoint.
 * - Therefore, when this function is called, there is always a previous command.
 *
 * @param {UndoManager} undoManager
 * @param {string} url
 */
function addCheckpoint(url) {
    if (!undoManager) {
        throw new Error("addCheckpoint: undoManager is required");
    }
    if (!url || typeof url !== "string") {
        throw new Error("addCheckpoint: url must be a non-empty string");
    }

    const previousCommand = undoManager.getCommands().at(-1);

    if (!previousCommand || typeof previousCommand.redo !== "function") {
        throw new Error("addCheckpoint: previous checkpoint command is missing or invalid");
    }

    undoManager.add({
        // UNDO: go back to the previous clean checkpoint state
        undo: async () => {
            await previousCommand.redo();
        },

        // REDO: fetch and install the new clean checkpoint state
        redo: async () => {
            await getServerStateAndSave(url);
        }
    });
}

/**
 * Compare two graph-state snapshots.
 * getGraphState() and fetchGraph() both return plain detached data.
 */
function sameState(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function redo() {
    undoManager.redo();
}



export async function restrictToReachableWithUndo(nodeId) {
  const graphId = getGraphId();

  if (!graphId) {
    throw new Error("restrictToReachableWithUndo: graphId is missing");
  }
  if (!nodeId) {
    throw new Error("restrictToReachableWithUndo: nodeId is required");
  }

  const url = `/graph/${graphId}/${nodeId}`;
  await transformAndCheckpoint(restrictToReachable, [nodeId], url);
}

/**
 * Materialize a JIT tail.
 *
 * This version does not decide whether the tail is needed.
 * It assumes the caller already checked that dirtyState and cleanState differ.
 *
 * @param {Function} checkpointRedoFn - the redo function of the current checkpoint
 * @param {Object} dirtyState - current dirty graph snapshot
 */
export function addTail(checkpointRedoFn, dirtyState) {
    if (typeof checkpointRedoFn !== "function" || !checkpointRedoFn.url) {
        throw new Error("addTail: checkpointRedoFn must be a function with a url property");
    }

    undoManager.add({
        // Undoing the tail restores the current clean checkpoint state
        undo: checkpointRedoFn,

        // Redoing the tail restores the dirty state captured before undo
        redo: async () => {
            setGraphState(dirtyState);
        }
    });
}

export async function undoWithAddTail() {
  const commands = undoManager.getCommands();
  const index = undoManager.getIndex();

  if (index < 0 || commands.length === 0) {
    return false;
  }

  const redoStackIsEmpty = index === commands.length - 1;

  if (redoStackIsEmpty) {
    const currentCommand = commands[index];
    const checkpointRedoFn = currentCommand?.redo;

    if (typeof checkpointRedoFn !== "function" || !checkpointRedoFn.url) {
      throw new Error("undoWithAddTail: current checkpoint redo has no url");
    }

    const dirtyState = getGraphState();
    const cleanState = await fetchGraph(checkpointRedoFn.url);

    if (JSON.stringify(dirtyState) !== JSON.stringify(cleanState)) {
      addTail(checkpointRedoFn, dirtyState);
      undoManager.undo();
      return true;
    }
  }

  // At this point, no tail was added.
  // So undoing index 0 would mean undoing the initial checkpoint itself,
  // which must never happen.
  if (index === 0) {
    return false;
  }

  undoManager.undo();
  return true;
}

/**
 * Execute a transformation, then append its synthetic checkpoint.
 *
 * Responsibilities:
 * - run the actual transformation (sync or async)
 * - append the corresponding checkpoint command
 *
 * Non-responsibilities:
 * - rendering
 * - DOM/view policy
 *
 * @param {Function} transformationFn
 * @param {Array} args
 * @param {string} url - canonical checkpoint URL for the clean state
 * @returns {Promise<void>}
 */
async function transformAndCheckpoint(transformationFn, args = [], url) {
  if (typeof transformationFn !== "function") {
    throw new Error("transformAndCheckpoint: transformationFn must be a function");
  }
  if (!url || typeof url !== "string") {
    throw new Error("transformAndCheckpoint: url must be a non-empty string");
  }

  // 1) Execute the actual transformation
  await transformationFn(...args);

  // 2) Record the synthetic checkpoint reached by this transformation
  addCheckpoint(url);
}

/**
 * Initialize the undo-manager stacks with the initial checkpoint.
 *
 * The initial checkpoint represents the canonical initial graph state.
 * Its redo fetches /graph/{graphId}.
 * Its undo must never be executed.
 */
export function initUndoRedoStacks() {
    const graphId = getGraphId();

    if (!graphId) {
        throw new Error("initUndoRedoStacks: graphId is missing");
    }

    const url = `/graph/${graphId}`;

    const redo = async () => {
        await getServerStateAndSave(url);
    };
    redo.url = url;

    undoManager.add({
        undo: async () => {
            throw new Error("Initial checkpoint cannot be undone");
        },
        redo
    });
}
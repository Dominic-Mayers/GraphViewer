// assets/graph/transformations-with-undo.js

import UndoManager from "undo-manager";

import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import {
    restrictToReachable,
    getServerStateAndSave,
} from "./transformations-api.js";

const undoManager = new UndoManager();

function noop() {}

/**
 * Return the array of commands if the library exposes it.
 * We rely on getCommands() in the current baseline.
 */
function getCommands() {
    const commands = undoManager.getCommands?.();
    if (!Array.isArray(commands)) {
        throw new Error("undo-manager getCommands() is unavailable");
    }
    return commands;
}

/**
 * The current checkpoint is the last command in the stack representation
 * used by the baseline.
 */
function getCurrentCommand() {
    const commands = getCommands();
    return commands.at(-1) ?? null;
}

/**
 * Build a dummy history token.
 * The token itself is inert; the real executable meaning is in token.cmd.
 */
function makeToken(cmd, extra = {}) {
    const token = noop;
    token.cmd = cmd;
    Object.assign(token, extra);
    return token;
}

/**
 * Initial synthetic checkpoint.
 * It records deferred meaning only; it does not fetch now.
 */
export function initUndoRedoStacks() {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("initUndoRedoStacks: graphId is missing");
    }

    const url = `/graph/${graphId}`;

    const undo = makeToken(async () => {
        throw new Error("Initial checkpoint cannot be undone");
    });

    const redo = makeToken(
        async () => {
            await getServerStateAndSave(url);
        },
        { url }
    );

    undoManager.add({ undo, redo });
}

/**
 * Add a checkpoint after a transformation.
 * This only records commands; it does not execute anything now.
 */
function addCheckpoint(url) {
    if (!url || typeof url !== "string") {
        throw new Error("addCheckpoint: url must be a non-empty string");
    }

    const previousCommand = getCurrentCommand();
    if (!previousCommand?.redo?.cmd) {
        throw new Error("addCheckpoint: previous redo.cmd is missing");
    }

    // Undo of the new checkpoint = command represented by previous redo
    const undo = makeToken(previousCommand.redo.cmd, {
        url: previousCommand.redo.url,
    });

    // Redo of the new checkpoint = fetch the cleaned state for this checkpoint
    const redo = makeToken(
        async () => {
            await getServerStateAndSave(url);
        },
        { url }
    );

    undoManager.add({ undo, redo });
}

/**
 * Execute a transformation, then register its synthetic checkpoint.
 * This is still the proper place to add checkpoints.
 */
async function transformAndCheckpoint(transformation, args = [], url) {
    await transformation(...args);
    addCheckpoint(url);
}

/**
 * Example exported transformation with undo support.
 * Adjust the URL logic if your cleaned checkpoint route differs.
 */
export async function restrictToReachableWithUndo(nodeId) {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("restrictToReachableWithUndo: graphId is missing");
    }

    const url = `/graph/${graphId}/${nodeId}`;
    await transformAndCheckpoint(restrictToReachable, [nodeId], url);
}

/**
 * Materialize the dirty tail.
 *
 * checkpointRedoFn: the redo token of the current checkpoint
 * dirtyState: snapshot of the current dirty graph state
 */
function addTail(checkpointRedoFn, dirtyState) {
    if (!checkpointRedoFn?.cmd) {
        throw new Error("addTail: checkpoint redo.cmd is missing");
    }
    if (!dirtyState) {
        throw new Error("addTail: dirtyState is required");
    }

    const undo = makeToken(checkpointRedoFn.cmd, {
        url: checkpointRedoFn.url,
    });

    const redo = makeToken(async () => {
        setGraphState(dirtyState);
    });

    undoManager.add({ undo, redo });
}

/**
 * Execute redo in the correct order:
 * 1. await the real command
 * 2. move the undo-manager stack with the dummy redo
 */
export async function redo() {
    if (!undoManager.hasRedo()) {
        return;
    }

    const command = getCurrentCommand();
    if (!command?.redo?.cmd) {
        throw new Error("redo: current redo.cmd is missing");
    }

    await command.redo.cmd();
    undoManager.redo();
}

/**
 * Execute undo with possible JIT tail materialization.
 *
 * Rule:
 * - if redo stack is empty and there is a dirty tail, materialize it first
 * - then execute the current undo command
 * - only after success move the stack with dummy undo
 */
export async function undoWithAddTail() {
    if (!undoManager.hasUndo()) {
        return;
    }

    const currentCommand = getCurrentCommand();
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoWithAddTail: current undo.cmd is missing");
    }

    // JIT delta-tail when redo stack is empty
    if (!undoManager.hasRedo()) {
        const dirtyState = getGraphState();

        // The current checkpoint redo describes the cleaned state to compare against.
        const checkpointRedoFn = currentCommand.redo;
        if (!checkpointRedoFn?.cmd) {
            throw new Error("undoWithAddTail: current redo.cmd is missing");
        }

        // Minimal pragmatic version:
        // if you decide a dirty tail exists whenever current state is not a checkpoint state,
        // materialize it here. This version assumes that when redo stack is empty,
        // the current visible state is a dirty tail relative to the current checkpoint.
        addTail(checkpointRedoFn, dirtyState);
    }

    const commandToUndo = getCurrentCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoWithAddTail: effective undo.cmd is missing");
    }

    await commandToUndo.undo.cmd();
    undoManager.undo();
}

export { undoManager };
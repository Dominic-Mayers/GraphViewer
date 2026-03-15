// assets/graph/undo-manager-jit-tail.js

import UndoManager from "undo-manager";
import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSaveCheckpoint} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";

const undoManager = new UndoManager();

let sync = true;

export function isSyncHist() {
    return sync;
}

export function unSyncHist() {
    sync = false;
}

export function initUndoRedoStacks() {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("initUndoRedoStacks: graphId is missing");
    }

    const url = `/graph/${graphId}`;

    const undo = function () {};
    undo.cmd = async () => {
        throw new Error("Initial checkpoint cannot be undone");
    };

    const redo = function () {};
    redo.cmd = async () => {
        await getServerStateAndSaveCheckpoint(url);
    };
    redo.url = url;

    undoManager.add({undo, redo});
    sync = true;
}

export function executeHist(url) {
    if (!url || typeof url !== "string") {
        throw new Error("executeHist: url must be a non-empty string");
    }

    const previousCommand = getCurrentCommand();
    if (!previousCommand?.redo?.cmd) {
        throw new Error("executeHist: previous redo.cmd is missing");
    }

    const undo = function () {};
    undo.cmd = previousCommand.redo.cmd;
    undo.url = previousCommand.redo.url;

    const redo = function () {};
    redo.cmd = async () => {
        await getServerStateAndSaveCheckpoint(url);
    };
    redo.url = url;

    undoManager.add({ undo, redo });
    sync = true;
}

export function redoHist() {
    if (!undoManager.hasRedo()) {
        return;
    }

    const command = getRedoCommand();
    if (!command?.redo?.cmd) {
        throw new Error("redoHist: current redo.cmd is missing");
    }

    undoManager.redo();
    sync = true;
    return command.redo.cmd;
}

export function undoHist({ captureTail } = {}) {
    if (!undoManager.hasUndo()) {
        return;
    }

    const currentCommand = getCurrentCommand();
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoHist: current undo.cmd is missing");
    }

    const redoTailState = getGraphState();
    if (!sync) {
        console.log("redoTailState.isSync is false");

        console.log("currentCommand.redo?.isTail = ", currentCommand.redo?.isTail);
        if (currentCommand.redo?.isTail) {
            console.log("Doing pure undoManager.undo()");
            undoManager.undo();
            console.log("Index after pure undo :", undoManager.getIndex());
        }

        if (typeof captureTail !== "function") {
            throw new Error("undoHist: captureTail is required when state is not synchronized");
        }

        const { undo, redo } = captureTail();
        addTail(undo, redo);
    } else {
        console.log("redoTailState.isSync is true, no tail added.");
    }

    const commandToUndo = getCurrentCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoHist: effective undo.cmd is missing");
    }

    undoManager.undo();
    sync = true; 
    return commandToUndo.undo.cmd;
}


export function getCurrentCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex();
    return commands[index] ?? null;
}

export function getPreviousCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex();
    return commands[index - 1] ?? null;
}

function getCommands() {
    const commands = undoManager.getCommands?.();
    if (!Array.isArray(commands)) {
        throw new Error("undo-manager getCommands() is unavailable");
    }
    return commands;
}

function getRedoCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex();
    return commands[index + 1] ?? null;
}

function addTail(undo, redo) {
    if (!undo || typeof undo !== "function") {
        throw new Error("addTail: undo must be a function");
    }
    if (!redo || typeof redo !== "function") {
        throw new Error("addTail: redo must be a function");
    }
    if (typeof undo.cmd !== "function") {
        throw new Error("addTail: undo.cmd is missing");
    }
    if (typeof redo.cmd !== "function") {
        throw new Error("addTail: redo.cmd is missing");
    }

    redo.isTail = true;
    undoManager.add({ undo, redo });
}

export { undoManager };

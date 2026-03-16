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

export function initHist() {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("initHist: graphId is missing");
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

export function executeHist(undo, redo) {
    if (!undo || typeof undo !== "function") {
        throw new Error("executeHist: undo must be a function");
    }
    if (!redo || typeof redo !== "function") {
        throw new Error("executeHist: redo must be a function");
    }
    if (typeof undo.cmd !== "function") {
        throw new Error("executeHist: undo.cmd is missing");
    }
    if (typeof redo.cmd !== "function") {
        throw new Error("executeHist: redo.cmd is missing");
    }

    addHist(undo, redo);
    sync = true;
}

export function prepareExecuteHist() {
    const currentCommand = getCurrentCommand();
    const mustCleanTail = currentCommand?.redo?.isTail && sync;

    if (!mustCleanTail) {
        return null;
    }

    if (!currentCommand?.undo?.cmd) {
        throw new Error("prepareExecuteHist: current undo.cmd is missing for tail cleanup");
    }

    return async function prepareMajorState() {
        await currentCommand.undo.cmd();
        undoManager.undo();
        sync = true;
    };
}

export function redoHist() {
    if (!canRedoHist()) {
        console.log("redoHist: no redo available");
        return null;
    }

    const command = getRedoCommand();
    if (!command?.redo?.cmd) {
        throw new Error("redoHist: current redo.cmd is missing");
    }

    undoManager.redo();
    sync = true;
    return command.redo.cmd;
}

export function undoHist( { captureTail } = {}) {

    if (!canUndoHist()) {
        console.log("undoHist: no undo available");
        return null;
    }

    if (!sync) {

        const currentCommand = getCurrentCommand();
        if (!currentCommand?.undo?.cmd) {
            throw new Error("undoHist: current undo.cmd is missing");
        }

        if (currentCommand.redo?.isTail) {
            undoManager.undo();
        }

        if (typeof captureTail !== "function") {
            throw new Error("undoHist: captureTail is required when state is not synchronized");
        }

        const {undo, redo} = captureTail();
        addTail(undo, redo);
    }

    const commandToUndo = getCurrentCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoHist: effective undo.cmd is missing");
    }

    undoManager.undo();
    sync = true;
    return commandToUndo.undo.cmd;
}

export function canUndoHist() {
    if (!sync) {
        return true;
    }

    return undoManager.hasUndo() && undoManager.getIndex() > 0;
}

export function canRedoHist() {
    return undoManager.hasRedo();
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
    redo.isTail = true;
    addHist(undo, redo);
}

function addHist(undo, redo) {
    if (!undo || typeof undo !== "function") {
        throw new Error("addHist: undo must be a function");
    }
    if (!redo || typeof redo !== "function") {
        throw new Error("addHist: redo must be a function");
    }
    if (typeof undo.cmd !== "function") {
        throw new Error("addHist: undo.cmd is missing");
    }
    if (typeof redo.cmd !== "function") {
        throw new Error("addHist: redo.cmd is missing");
    }

    undoManager.add({ undo, redo });
}

function isAtInitialCheckpoint() {
    return undoManager.getIndex() === 0;
}

export {undoManager}; 
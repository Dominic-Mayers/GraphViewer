// assets/graph/undo-manager-jit-tail.js

import UndoManager from "undo-manager";
import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSaveCheckpoint} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";

const undoManager = new UndoManager();

let sync = true;
let hasTail = false;

export function atTail() {
    return hasTail && undoManager.getIndex() === undoManager.getCommands().length - 1;
}

export function logStateHist(why) {
    console.log(why, 'index=', undoManager.getIndex(), 'last=', undoManager.getCommands().length - 1, 'hasTail=', hasTail, 'sync=', sync);
}

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
    hasTail = false;
}

export function executeHist(undo, redo) {
    addCheckpoint(undo, redo, false);
    logStateHist("ExecuteHist:");
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
    logStateHist('redoHist: ');
    return command.redo.cmd;
}

export function undoHist( { initTail } = {}) {

    if (!canUndoHist()) {
        console.log("undoHist: no undo available");
        return null;
    }

    if (!sync) {

        const currentCommand = getCurrentCommand();
        if (!currentCommand?.undo?.cmd) {
            throw new Error("undoHist: current undo.cmd is missing");
        }

        if (typeof initTail !== "function") {
            throw new Error("undoHist: initTail is required when state is not synchronized");
        }

        const {undo, redo} = initTail();
        addCheckpoint(undo, redo, true); 
    }

    const commandToUndo = getCurrentCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoHist: effective undo.cmd is missing");
    }

    undoManager.undo();
    sync = true;
    logStateHist('undoHist: ');
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


function addCheckpoint(undo, redo, isTail) {
    if (!undo || typeof undo !== "function") {
        throw new Error("addCheckpoint: undo must be a function");
    }
    if (!redo || typeof redo !== "function") {
        throw new Error("addCheckpoint: redo must be a function");
    }
    if (typeof undo.cmd !== "function") {
        throw new Error("addCheckpoint: undo.cmd is missing");
    }
    if (typeof redo.cmd !== "function") {
        throw new Error("addCheckpoint: redo.cmd is missing");
    }

    if (hasTail && undoManager.getIndex() === undoManager.getCommands().length - 1) {
        undoManager.undo();
        hasTail = false;
    }

    undoManager.add({undo, redo});
    hasTail = isTail; 
    sync = true; 
}

function isAtInitialCheckpoint() {
    return undoManager.getIndex() === 0;
}

export {undoManager}; 
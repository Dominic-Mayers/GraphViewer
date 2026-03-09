// assets/graph/transformations-with-undo.js

import UndoManager from "undo-manager";

import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import {
    restrictToReachable,
    getServerStateAndSave,
} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";

const undoManager = new UndoManager();

function getCommands() {
    const commands = undoManager.getCommands?.();
    if (!Array.isArray(commands)) {
        throw new Error("undo-manager getCommands() is unavailable");
    }
    return commands;
}

function getUndoCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex() - 1;
    return commands[index] ?? null;
}

function getRedoCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex();
    return commands[index] ?? null;
}

function getCurrentPairBeforeAdd() {
    return getRedoCommand();
}

function graphStatesEqual(a, b) {
    const strA = JSON.stringify(a);
    const strB = JSON.stringify(b);
    const equal = strA === strB;
    if (equal) {
        console.log("strA and strB are equal.");
    } else {
        console.log("strA and strB are not equal.");
        console.log('a.isCanonical: ', a.isCanonical); 
        console.log('b.isCanonical: ', b.isCanonical); 
    }
    return equal;
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
        await getServerStateAndSave(url);
    };
    redo.url = url;

    undoManager.add({ undo, redo });
}

function addCheckpoint(url) {
    if (!url || typeof url !== "string") {
        throw new Error("addCheckpoint: url must be a non-empty string");
    }

    const previousCommand = getCurrentPairBeforeAdd();
    if (!previousCommand?.redo?.cmd) {
        throw new Error("addCheckpoint: previous redo.cmd is missing");
    }

    const undo = function () {};
    undo.cmd = previousCommand.redo.cmd;
    undo.url = previousCommand.redo.url;

    const redo = function () {};
    redo.cmd = async () => {
        await getServerStateAndSave(url);
    };
    redo.url = url;

    undoManager.add({ undo, redo });
}

async function transformAndCheckpoint(transformation, args = [], url) {
    await transformation(...args);
    addCheckpoint(url);
}

export async function restrictToReachableWithUndo(nodeId) {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("restrictToReachableWithUndo: graphId is missing");
    }

    const url = `/graph/${graphId}/${nodeId}`;
    await transformAndCheckpoint(restrictToReachable, [nodeId, true], url);
}

function addTail(undoUrl, redoState) {
    if (!undoUrl) {
        throw new Error("addTail: undoUrl is missing");
    }
    if (!redoState) {
        throw new Error("addTail: redoState is required");
    }

    console.log('AddTail undoURL: ', undoUrl, ' Current index :', undoManager.getIndex()); 
    const undo = function () {};
    undo.cmd = async () => {
        getServerStateAndSave(undoUrl);
    };
    undo.url = undoUrl;

    const redo = function () {};
    redo.cmd = async () => {
        setGraphState(redoState);
    };
    redo.url = "";
    redo.isTail = true;

    undoManager.add({ undo, redo });
    console.log('Tail added. New index :', undoManager.getIndex()); 
}

export async function redo() {
    if (!undoManager.hasRedo()) {
        return;
    }

    const command = getRedoCommand();
    if (!command?.redo?.cmd) {
        throw new Error("redo: current redo.cmd is missing");
    }

    await command.redo.cmd();
    undoManager.redo();
}

export async function undoWithAddTail() {
    if (!undoManager.hasUndo()) {
        return;
    }

    const currentCommand = getRedoCommand();
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoWithAddTail: current undo.cmd is missing");
    }

    if (!undoManager.hasRedo() && !currentCommand.redo?.isTail) {
        const checkpointUrl = currentCommand.redo?.url;
        if (!checkpointUrl) {
            throw new Error("undoWithAddTail: current redo.url is missing");
        }

        const undoTailState = await fetchGraph(checkpointUrl);
        const redoTailState = getGraphState();

        if (true || !redoTailState.isCanonical) {
            console.log('undoUrl = checkpointUrl = ', checkpointUrl); 
            console.log('No check of isCanonical, no comparison, always addTail');``
            console.log('Before addTail(checkpointUrl, redoTailState), redoTailState.saveId = ', redoTailState.saveId)
            addTail(checkpointUrl, redoTailState);
        }
    }

    const commandToUndo = getUndoCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoWithAddTail: effective undo.cmd is missing");
    }

    await commandToUndo.undo.cmd();
    undoManager.undo();
    console.log('After await commandToUndo.undo.cmd();, getGraphState().saveId = ',  getGraphState().saveId )
}

export { undoManager };

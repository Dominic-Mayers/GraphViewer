// assets/graph/transformations-with-undo.js

import UndoManager from "undo-manager";

import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSave} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";

const undoManager = new UndoManager();

function getCommands() {
    const commands = undoManager.getCommands?.();
    if (!Array.isArray(commands)) {
        throw new Error("undo-manager getCommands() is unavailable");
    }
    return commands;
}

function getRedoCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex() + 1;
    return commands[index] ?? null;
}

function getCurrentCommand() {
    const commands = getCommands();
    const index = undoManager.getIndex();
    return commands[index] ?? null;
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

    undoManager.add({undo, redo});
}

function addCheckpoint(url) {
    if (!url || typeof url !== "string") {
        throw new Error("addCheckpoint: url must be a non-empty string");
    }

    const previousCommand = getCurrentCommand();
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

    undoManager.add({undo, redo});
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

    const undo = function () {};
    undo.cmd = async () => {
        console.log('getServerStateAndSave(undoUrl) with undoUrl =', undoUrl); 
        await getServerStateAndSave(undoUrl);
    };
    undo.url = undoUrl;

    const redo = function () {};
    redo.cmd = async () => {
        setGraphState(redoState);
    };
    redo.url = "";
    redo.isTail = true;

    undoManager.add({undo, redo});
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

    const commands = undoManager.getCommands();     
    const index = undoManager.getIndex();

    console.log("redo index =", index);
    console.log("commands[index]?.redo?.url =", commands[index]?.redo?.url);
    console.log("commands[index + 1]?.redo?.url =", commands[index + 1]?.redo?.url);
    console.log("commands[index - 1]?.redo?.url =", commands[index - 1]?.redo?.url);
    
    console.log('In redo, command.redo.url =', command.redo.url); 
    await command.redo.cmd();
    undoManager.redo();
}

export async function undoWithAddTail() {
    if (!undoManager.hasUndo()) {
        return;
    }

    const currentCommand = getCurrentCommand();
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoWithAddTail: current undo.cmd is missing");
    }

    if (!undoManager.hasRedo() && !currentCommand.redo?.isTail) {
        const checkpointUrl = currentCommand.redo?.url;
        if (!checkpointUrl) {
            throw new Error("undoWithAddTail: current redo.url is missing");
        }
        
        console.log ('Fetching undoTailState, a checkpointSate, with url: ', checkpointUrl); 
        const undoTailState = await fetchGraph(checkpointUrl);
        const redoTailState = getGraphState();

        if (!redoTailState.isCanonical) {
            console.log('redoTailState.isCanonical is false');
            console.log('undoUrl for tail (checkpointUrl) = ', checkpointUrl);
            addTail(checkpointUrl, redoTailState);
        }
        else {
            console.log('redoTailState.isCanonical is true, no tail added.');
            
        }
    }

    const commandToUndo = getCurrentCommand();
    if (!commandToUndo?.undo?.cmd) {
        throw new Error("undoWithAddTail: effective undo.cmd is missing");
    }

    console.log('Now, we call the undo with url ', commandToUndo.undo.url); 
    await commandToUndo.undo.cmd();
    undoManager.undo();
}

export { undoManager };

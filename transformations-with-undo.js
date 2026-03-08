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

function getCurrentCommand(why) {
    const commands = getCommands();
    const index = undoManager.getIndex(); 
    console.log ('Commands: ', JSON.stringify(commands)); 
    console.log ('Index (of undo tip?): ', index); 
    console.log ('Purpose: ', why); 
    return commands[index] ?? null;
}

function graphStatesEqual(a, b) {
    const strA = JSON.stringify(a);
    const strB = JSON.stringify(b);
    const equal = strA === strB; 
    if (equal) {
        console.log('strA and strB are equal.'); 
    } else {
        console.log('strA and strB are not equal.'); 
    }
    //console.log('strA: ', strA);
    //console.log('strB: ', strB); 
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
    console.log('In addCheckPoint (previous command)', url); 
    const previousCommand = getCurrentCommand('To get undo.cmd and undo.url in checkpoint.');
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
    await transformAndCheckpoint(restrictToReachable, [nodeId], url);
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
        getServerStateAndSave(undoUrl);
    };
    undo.url = undoUrl;

    const redo = function () {};
    redo.cmd = async () => {
        setGraphState(redoState);
    };
    redo.url = ''; 
    redo.isTail = true;

    undoManager.add({ undo, redo });
}

export async function redo() {
    if (!undoManager.hasRedo()) {
        return;
    }

    console.log('In redo wrapper (command to redo)'); 
    const command = getCurrentCommand('To execute redo.cmd in redo wrapper');
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

    console.log('In undoWithAddTail before guard (command to undo)'); 
    const currentCommand = getCurrentCommand('To check redo?.isTail and addTail(redo, dirtyState)  in undoWithAddTail');
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoWithAddTail: current undo.cmd is missing");
    }

    if (!undoManager.hasRedo() && !currentCommand.redo?.isTail) {
        console.log('In undoWithAddTail passed guard'); 
        const checkpointUrl = currentCommand.redo?.url;
        if (!checkpointUrl) {
            throw new Error("undoWithAddTail: current redo.url is missing");
        }

        const undoTailState = await fetchGraph(checkpointUrl);
        const redoTailState = getGraphState();  

        // Only if currentCommand.redo snapshot is different 
        if (!graphStatesEqual(undoTailState, redoTailState)) {
            addTail(checkpointUrl, redoTailState);
        }
    }

    console.log('In redo wrapper (refreshing commands)'); 
    const commandToUndo = getCurrentCommand('To execute undo.cmd in undoWithAddTail.');
    if (!currentCommand?.undo?.cmd) {
        throw new Error("undoWithAddTail: effective undo.cmd is missing");
    }

    
    await currentCommand.undo.cmd();
    console.log('In undoWithAddTail, did undo with currentCommand.undo.url = :', currentCommand.undo.url); 
    undoManager.undo();
}

export { undoManager };
import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSaveCheckpoint} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";
import { executeHist, getCurrentCommand, getPreviousCommand } from "./undo-manager-jit-tail.js"; 

async function transformAndCheckpoint(transformation, args = [], url) {
    await transformation(...args);
    executeHist(url);
}

export async function restrictToReachableWithUndo(nodeId) {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("restrictToReachableWithUndo: graphId is missing");
    }

    const url = `/graph/${graphId}/${nodeId}`;
    await transformAndCheckpoint(restrictToReachable, [nodeId, true], url);
}

export async function captureTailFactory() {
    const currentCommand = getCurrentCommand();
    const checkpointUrl = currentCommand?.redo?.isTail
        ? getPreviousCommand()?.redo?.url
        : currentCommand?.redo?.url;

    if (!checkpointUrl) {
        throw new Error("captureTailFactory: checkpoint redo.url is missing");
    }

    const payload = await fetchGraph(checkpointUrl);
    const undoTailState = {
        graphId: payload.graphId,
        nodes: payload.nodes,
        adjacency: payload.adjacency
    };

    return function captureTail() {
        const redoTailState = getGraphState();

        const undo = function () {};
        undo.url = checkpointUrl;
        undo.cmd = async function () {
            setGraphState(undoTailState, false, true);
        };

        const redo = function () {};
        redo.url = "";
        redo.isTail = true;
        redo.cmd = async function () {
            setGraphState(redoTailState, false, true);
        };

        return { undo, redo };
    };
}

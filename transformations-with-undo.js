import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSaveCheckpoint} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";
import { executeHist, getIncomingForwardCommand, atTail } from "./undo-manager-jit-tail.js";

async function transformAndCheckpoint(transformation, args = [], url) {

    const undoCmd = getIncomingForwardCommand(); // because in our case IncomingForward (redo of current) = IncomingBackward (undo of next).

    if (!undoCmd) {
        throw new Error("transformAndCheckpoint: incoming-forward cmd is missing");
    }

    const undo = function () {};
    undo.cmd = undoCmd;
    undo.cmd.url = undoCmd.url;

    const redo = function () {};
    redo.cmd = async () => {
        await getServerStateAndSaveCheckpoint(url);
    };
    redo.cmd.url = url;

    await transformation(...args);
    executeHist(undo, redo);
}

export async function restrictToReachableWithUndo(nodeId) {
    const graphId = getGraphId();
    if (!graphId) {
        throw new Error("restrictToReachableWithUndo: graphId is missing");
    }

    const url = `/graph/${graphId}/${nodeId}`;
    await transformAndCheckpoint(restrictToReachable, [nodeId, true], url);
}

export async function initTailFactory() {
    const checkpointRedoCmd = getIncomingForwardCommand();

    const checkpointUrl = checkpointRedoCmd?.url;
    if (!checkpointUrl) {
        throw new Error("initTailFactory: incoming-forward cmd.url is missing");
    }

    const payload = await fetchGraph(checkpointUrl);
    const undoTailState = {
        graphId: payload.graphId,
        nodes: payload.nodes,
        adjacency: payload.adjacency
    };

    return function initTail() {
        const redoTailState = getGraphState();

        const undo = function () {};
        undo.cmd = async function () {
            setGraphState(undoTailState, false, true);
        };
        undo.cmd.url = checkpointUrl;

        const redo = function () {};
        redo.cmd = async function () {
            setGraphState(redoTailState, false, true);
        };
        redo.cmd.url = "";

        return { undo, redo };
    };
}

import { getGraphId, getGraphState, setGraphState } from "./graph-state.js";
import { restrictToReachable, getServerStateAndSaveCheckpoint} from "./transformations-api.js";
import { fetchGraph } from "./graph-server-api.js";
import { executeHist, getCurrentCommand, getPreviousCommand, atTail } from "./undo-manager-jit-tail.js";

async function transformAndCheckpoint(transformation, args = [], url) {

    const previousCommand = atTail()
            ? getPreviousCommand()
            : getCurrentCommand();

    if (!previousCommand?.redo?.cmd) {
        throw new Error("transformAndCheckpoint: previous redo.cmd is missing");
    }

    const undo = function () {};
    undo.cmd = previousCommand.redo.cmd;
    undo.cmd.url = previousCommand.redo.cmd.url;

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
    const currentCommand = getCurrentCommand();
    const checkpointUrl = atTail()
            ? getPreviousCommand()?.redo?.cmd?.url
            : currentCommand?.redo?.cmd?.url;

    if (!checkpointUrl) {
        throw new Error("initTailFactory: checkpoint redo.cmd.url is missing");
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

        return {undo, redo};
    };
}

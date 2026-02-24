// graph-state.js
// Stores the SPA's structural graph state with unified transformation API

let graphState = {
    nodes: {},
    adjacency: {},
    incoming: {}   // automatically maintained
};

/**
 * Returns a deep copy of the current graph state
 */
export function getGraphState() {
    // return shallow copy for nodes and adjacency; internal code can access internal objects if needed
    return graphState;
}

/**
 * Replaces the graph state with a new one, recomputing incoming
 * @param {Object} newState - { nodes: {...}, adjacency: {...} }
 */
export function setGraphState(newState) {
    graphState.nodes = newState.nodes || {};
    graphState.adjacency = newState.adjacency || {};
    rebuildIncoming();
}

/**
 * Applies incremental or full graph transformations
 * @param {Object} params
 * @param {Object} params.addNodes - new nodes to add { nodeId: nodeObj }
 * @param {Object} params.addAdjacency - new adjacency { sourceId: { targetId: arrow } }
 * @param {Array} params.deleteNodes - nodeIds to remove
 * @param {Object} params.options
 *      options.incrementalIncoming (boolean) - if true, updates incoming incrementally; default false (full rebuild)
 */
export function applyGraphTransformation({ addNodes = {}, addAdjacency = {}, deleteNodes = [], options = {} }) {
    const incremental = options.incrementalIncoming || false;

    // ---- 1. Delete nodes ----
    if (deleteNodes.length > 0) {
        for (const nodeId of deleteNodes) {
            delete graphState.nodes[nodeId];
            delete graphState.adjacency[nodeId];
        }
        // remove edges pointing to deleted nodes
        for (const src in graphState.adjacency) {
            for (const tgt of deleteNodes) {
                delete graphState.adjacency[src]?.[tgt];
            }
        }
    }

    // ---- 2. Add nodes ----
    Object.assign(graphState.nodes, addNodes);

    // ---- 3. Add adjacency ----
    for (const src in addAdjacency) {
        graphState.adjacency[src] = graphState.adjacency[src] || {};
        Object.assign(graphState.adjacency[src], addAdjacency[src]);
    }

    // ---- 4. Update incoming ----
    if (incremental) {
        updateIncomingIncremental(addAdjacency, deleteNodes);
    } else {
        rebuildIncoming();
    }

    return graphState;
}

/**
 * Fully rebuilds the incoming map from current adjacency
 */
function rebuildIncoming() {
    const incoming = {};
    for (const src in graphState.adjacency) {
        for (const tgt in graphState.adjacency[src]) {
            if (!incoming[tgt]) incoming[tgt] = {};
            incoming[tgt][src] = graphState.adjacency[src][tgt];
        }
    }
    graphState.incoming = incoming;
}

/**
 * Incrementally update the incoming map
 * @param {Object} addAdjacency
 * @param {Array} deleteNodes
 */
function updateIncomingIncremental(addAdjacency = {}, deleteNodes = []) {
    // 1. Remove all entries pointing to deleted nodes
    for (const tgt of deleteNodes) {
        delete graphState.incoming[tgt];
    }
    for (const src in graphState.incoming) {
        for (const tgt of deleteNodes) {
            delete graphState.incoming[src]?.[tgt];
        }
    }

    // 2. Add new edges
    for (const src in addAdjacency) {
        for (const tgt in addAdjacency[src]) {
            graphState.incoming[tgt] = graphState.incoming[tgt] || {};
            graphState.incoming[tgt][src] = addAdjacency[src][tgt];
        }
    }
}
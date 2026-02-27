// assets/graph-state.js
// Stores the SPA's structural graph state with unified transformation API

// Maybe eventually the state will be a dictionary indexed by graphId. 
// The state knows it graphId and it is needed to fetch the server. 

let graphState = {
    graphId: null,
    nodes: {},
    adjacency: {},
    incoming: {}   // automatically maintained
};

/**
 * Get the graphId (Npt needed now.)
 */
export function getGraphId() {
    return graphState.graphId;
}

/**
 * Returns the current graph state
 */
export function getGraphState() {
    return graphState;
}

/**
 * Replaces the graph state with a new one, recomputing incoming
 * @param {Object} newState - { nodes: {...}, adjacency: {...} }
 */
export function setGraphState(newState) {
    graphState.graphId = newState.graphId ?? graphState.graphId;  
    graphState.nodes = newState.nodes || {};
    graphState.adjacency = newState.adjacency || {};
    rebuildIncoming();
}

/**
 * Wrapper over applyGraphTransformation with incrementalIncoming = true
 * @param {Object} delta - delta of applyGraphTransformation
 */
export function applyDelta(delta) {
    delta.options ??= {};
    delta.options.incrementalIncoming = true;
    const graphState = applyGraphTransformation(delta);
    return  graphState; 
}


export function applyGraphTransformation({
    addNodes = {},
    addAdjacency = {},
    deleteNodes = [],
    options = {incrementalIncoming: true} 
}) {
    
    const incremental = options.incrementalIncoming || false;

    // ---- 1. Delete nodes ----
    if (deleteNodes.length > 0) {
        for (const nodeId of deleteNodes) {
            delete graphState.nodes[nodeId];
            delete graphState.adjacency[nodeId];
        }

        // Remove edges pointing to deleted nodes
        for (const src in graphState.adjacency) {
            for (const tgt of deleteNodes) {
                delete graphState.adjacency[src]?.[tgt];
            }
        }
    }

    // ---- 2. Add nodes ----
    Object.assign(graphState.nodes, addNodes);

    // ---- 3. Merge valid adjacency ----
    for (const src in addAdjacency) {
        graphState.adjacency[src] = graphState.adjacency[src] || {};
        Object.assign(graphState.adjacency[src], addAdjacency[src]);
    }

    // ---- 4. Update incoming ----
    if (incremental) {
        updateIncomingIncremental(addNodes, addAdjacency, deleteNodes);
    } else {
        rebuildIncoming();
    }

    return graphState;
}

 /**
 * Incrementally update the incoming map
 * @param {Object} addNodes
 * @param {Object} addAdjacency
 * @param {Array} deleteNodes
 */
 function updateIncomingIncremental(addNodes = {}, addAdjacency = {}, deleteNodes = []) {
     // 1. Remove deleted nodes from incoming
     for (const nodeId of deleteNodes) {
         delete graphState.incoming[nodeId];
     }
     for (const tgt in graphState.incoming) {
        for (const nodeId of deleteNodes) {
            delete graphState.incoming[tgt]?.[nodeId];
        }
    }

    // 2. Initialize incoming for new nodes
    for (const nodeId in addNodes) {
        if (!graphState.incoming[nodeId]) graphState.incoming[nodeId] = {};
    }

    // 3. Add edges
    for (const src in addAdjacency) {
        for (const tgt in addAdjacency[src]) {
            graphState.incoming[tgt] = graphState.incoming[tgt] || {};
            graphState.incoming[tgt][src] = addAdjacency[src][tgt];
        }
    }
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

function filterValidAdjacency(addAdjacency, addNodes, deleteNodes) {
    const result = {};

    // Build the final node set
    const finalNodes = new Set(Object.keys(graphState.nodes));

    // Apply deletions
    deleteNodes.forEach(id => finalNodes.delete(id));

    // Apply additions
    Object.keys(addNodes).forEach(id => finalNodes.add(id));

    // Filter arrows
    for (const src in addAdjacency) {
        for (const tgt in addAdjacency[src]) {
            if (finalNodes.has(src) && finalNodes.has(tgt)) {
                result[src] = result[src] || {};
              result[src][tgt] = addAdjacency[src][tgt];
            }
        }
    }

    return result;
}

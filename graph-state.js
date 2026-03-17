// assets/graph/graph-state.js
// Graph state container + mutation engine (delta-aware), with clear separation:
// - setGraphState(snapshot): authoritative replace + rebuild incoming index
// - applyDelta(delta): incremental mutation (supports optional edge deletions)

let graphState = {
  graphId: null, 
  nodes: {},
  adjacency: {},
  incoming: {} // derived index; owned + maintained here
};

/**
 * Get the graphId
 */
export function getGraphId() {
  return graphState.graphId;
}

/**
 * Read-only snapshot of current graph state.
 * This avoids leaking internal references to state-owned objects.
 */
export function getGraphState() {
  return snapshotState(graphState);
}
  
/**
 * Authoritative replace of the whole state.
 * This is NOT a delta application and should not compute deltas.
 *
 * @param {Object} newState - { graphId, nodes, adjacency }
 * @param {bool} canonical - tells whether it comes from a main transformation or its cleaned version.
 * @param {bool} tail - tells whether it comes from adding a tail.
 */
export function setGraphState(newState, canonical = false, tail = false) {
  graphState.graphId = newState.graphId ?? graphState.graphId;
  graphState.nodes = newState.nodes || {};
  graphState.adjacency = newState.adjacency || {};
  rebuildIncoming();
  return getGraphState();
}

/**
 * ---- Internal implementation: the only place that mutates graphState ----
 */
export function applyDelta(
  { addNodes = {}, addAdjacency = {}, deleteNodes = [], deleteAdjacency = {} },
  options = { incrementalIncoming: true }, canonical = false, isCheckpoint = false
) {
  const incremental = options.incrementalIncoming ?? false;

  // ---- 0. Delete edges explicitly requested ----
  // Supports:
  //   deleteAdjacency[src] = { tgt1: true, tgt2: true }
  // or deleteAdjacency[src] = [tgt1, tgt2]
  for (const src in deleteAdjacency) {
    const spec = deleteAdjacency[src];
    const tgts = Array.isArray(spec) ? spec : Object.keys(spec || {});
    for (const tgt of tgts) {
      if (graphState.adjacency[src]) {
        delete graphState.adjacency[src][tgt];
      }
      if (graphState.incoming[tgt]) {
        delete graphState.incoming[tgt][src];
      }
    }
  }

  // ---- 1. Delete nodes (and all incident edges) ----
  if (deleteNodes.length > 0) {
    for (const nodeId of deleteNodes) {
      // Remove outgoing edges from this node
      delete graphState.adjacency[nodeId];

      // Remove incoming index bucket
      delete graphState.incoming[nodeId];

      // Remove node
      delete graphState.nodes[nodeId];
    }

    // Remove edges pointing to deleted nodes (outgoing lists of remaining nodes)
    for (const src in graphState.adjacency) {
      for (const tgt of deleteNodes) {
        if (graphState.adjacency[src]) delete graphState.adjacency[src][tgt];
      }
    }

    // Remove edges from incoming index that originate in deleted nodes
    for (const tgt in graphState.incoming) {
      for (const src of deleteNodes) {
        if (graphState.incoming[tgt]) delete graphState.incoming[tgt][src];
      }
    }
  }

  // ---- 2. Add nodes ----
  Object.assign(graphState.nodes, addNodes);

  // ---- 3. Add/merge adjacency ----
  for (const src in addAdjacency) {
    graphState.adjacency[src] = graphState.adjacency[src] || {};
    Object.assign(graphState.adjacency[src], addAdjacency[src]);
  }

  // ---- 4. Update incoming index ----
  if (incremental) {
    updateIncomingIncremental(addNodes, addAdjacency, deleteNodes);
  } else {
    rebuildIncoming();
  }
}

/**
 * Incrementally update incoming index for added nodes/edges and deleted nodes.
 * Note: explicit deleteAdjacency is handled in applyDeltaInternal() directly.
 */
function updateIncomingIncremental(addNodes = {}, addAdjacency = {}, deleteNodes = []) {
  // Remove deleted nodes from incoming
  for (const nodeId of deleteNodes) {
    delete graphState.incoming[nodeId];
  }
  for (const tgt in graphState.incoming) {
    for (const nodeId of deleteNodes) {
      if (graphState.incoming[tgt]) delete graphState.incoming[tgt][nodeId];
    }
  }

  // Initialize incoming buckets for new nodes
  for (const nodeId in addNodes) {
    graphState.incoming[nodeId] ||= {};
  }

  // Add incoming edges for new adjacency
  for (const src in addAdjacency) {
    for (const tgt in addAdjacency[src]) {
      graphState.incoming[tgt] ||= {};
      graphState.incoming[tgt][src] = addAdjacency[src][tgt];
    }
  }
}

/**
 * Full rebuild of incoming from adjacency.
 */
function rebuildIncoming() {
  const incoming = {};
  for (const src in graphState.adjacency) {
    for (const tgt in graphState.adjacency[src]) {
      incoming[tgt] ||= {};
      incoming[tgt][src] = graphState.adjacency[src][tgt];
    }
  }
  graphState.incoming = incoming;
}

/**
 * Create a deep snapshot to avoid leaking references to internal mutable objects.
 */
function snapshotState(state) {
  // structuredClone is supported in modern browsers; fallback for older runtimes.
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state));
}
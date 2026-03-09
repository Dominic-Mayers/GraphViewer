// assets/graph/graph-server-api.js
//
// Server access layer for graph-related payloads.
// This module is responsible ONLY for fetching server data.
// It does not mutate graph-state and does not perform rendering.
//
// Two server contracts exist:
//   1) Graph payloads (authoritative state)
//   2) Delta payloads (instructions for mutating current state)

function getCallerName() {
  try {
    throw new Error();
  } catch (e) {
    // The stack trace string needs to be parsed
    // The exact format varies slightly by browser
    const stackLines = e.stack.split('\n');
    // The third line typically contains the calling function information
    // (the first two lines are "Error" and the current function)
    const callerInfo = stackLines[2].trim(); 
    return callerInfo;
  }
}

 /**
  * Fetch a full graph payload from the server.
  * Intended for authoritative states such as:
  *   - initial graph
  *   - synthetic checkpoints
  *
  * Expected payload structure:
  * {
  *   graphId,
  *   nodes,
  *   adjacency,
  *   deleteNodes: []   // typically empty for a full graph
  * }
  *
  * @param {string} url
  * @returns {Promise<Object>} graph payload
  */
export async function fetchGraph(url) {
  if (!url || typeof url !== "string") {
    throw new Error("fetchGraph: url must be a non-empty string");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`fetchGraph: failed to fetch graph from ${url}`);
  }

  const payload = await response.json();
  
  console.log('From ', getCallerName(), ' ; fetchGraph, got payload for', url); 
  return {
    graphId: payload.graphId,
    nodes: payload.nodes || {},
    adjacency: payload.adjacency || {},
    deleteNodes: payload.deleteNodes || []
  };
}

/**
 * Fetch a delta payload from the server.
 * Intended for server-backed transformations such as:
 *   - expandGroup
 *   - collapseGroup
 *
 * Expected payload structure:
 * {
 *   subgraph: {
 *     nodes,
 *     adjacency
 *   },
 *   deleteNodes
 * }
 *
 * @param {string} url
 * @returns {Promise<Object>} delta payload
 */
export async function fetchDelta(url) {
  if (!url || typeof url !== "string") {
    throw new Error("fetchDelta: url must be a non-empty string");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`fetchDelta: failed to fetch delta from ${url}`);
  }

  const payload = await response.json();

  return {
    subgraph: {
      nodes: payload.subgraph?.nodes || {},
      adjacency: payload.subgraph?.adjacency || {}
    },
    deleteNodes: payload.deleteNodes || []
  };
}
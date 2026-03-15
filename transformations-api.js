// assets/graph/transformations-api.js
//
// Responsibilities:
// - Execute graph transformations (local or server-backed).
// - Mutate graph state via graph-state.js.
//
// Non-responsibilities:
// - Rendering the graph.
// - DOM/view policy.

import { getGraphState, getGraphId, applyDelta, setGraphState } from "./graph-state.js";
import { applyDeltaWithFiltering } from "./transformation-helper.js";
import { fetchGraph, fetchDelta } from "./graph-server-api.js";
import { unSyncHist } from "./undo-manager-jit-tail.js"; 

/**
 * Server-backed: expand a group node.
 * Mutates graph state only; rendering is handled elsewhere.
 */
export async function expandGroup(groupId) {
  const graphId = getGraphId();

  const payload = await fetchDelta(`/expandGroup/${graphId}/${groupId}`);

  const delta = {
    addNodes: payload.subgraph.nodes,
    addAdjacency: payload.subgraph.adjacency,
    deleteNodes: payload.deleteNodes
  };

  applyDeltaWithFiltering(delta);
  unSyncHist();
}

/**
 * Server-backed: collapse a group node.
 * Mutates graph state only; rendering is handled elsewhere.
 */
export async function collapseGroup(groupId) {
  const graphId = getGraphId();

  const payload = await fetchDelta(`/collapseGroup/${graphId}/${groupId}`);

  const delta = {
    addNodes: payload.subgraph.nodes,
    addAdjacency: payload.subgraph.adjacency,
    deleteNodes: payload.deleteNodes
  };

  applyDeltaWithFiltering(delta);
  unSyncHist(); 
}

/**
 * Local-only: restrict graph to nodes reachable from startNodeId.
 * Mutates graph state only; rendering is handled elsewhere.
 */
export function restrictToReachable(startNodeId, isCheckpoint = false) {
  console.log('Major with node', startNodeId );   
  const state = getGraphState();

  const visited = new Set();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!visited.has(current) && state.nodes[current]) {
      visited.add(current);
      const targets = state.adjacency[current];
      if (targets) {
        for (const tgtId in targets) {
          if (!visited.has(tgtId)) queue.push(tgtId);
        }
      }
    }
  }

  const addNodes = {};
  const addAdjacency = {};
  visited.forEach(nodeId => {
    addNodes[nodeId] = state.nodes[nodeId];
    if (state.adjacency[nodeId]) {
      for (const tgtId in state.adjacency[nodeId]) {
        if (visited.has(tgtId)) {
          addAdjacency[nodeId] ||= {};
          addAdjacency[nodeId][tgtId] = state.adjacency[nodeId][tgtId];
        }
      }
    }
  });

  const deleteNodes = Object.keys(state.nodes).filter(id => !visited.has(id));

  applyDelta({ addNodes, addAdjacency, deleteNodes }, true, isCheckpoint);
}

/**
 * Server-backed: fetch a canonical graph state and install it.
 * Intended for synthetic checkpoints and other authoritative restores.
 * Mutates graph state only; rendering is handled elsewhere.
 */
export async function getServerStateAndSaveCheckpoint(url) {
  const payload = await fetchGraph(url);
  setGraphState({
    graphId: payload.graphId,
    nodes: payload.nodes,
    adjacency: payload.adjacency
  }, true);
}
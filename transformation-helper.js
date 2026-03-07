// assets/graph/transformation-helper.js

import { getGraphState, applyDelta } from './graph-state.js';

/**
 * Apply a delta (nodes + adjacency) to the graph state with SPA-specific filtering.
 * Removes edges whose source or target does not exist in the current graph state.
 * Does not call rendering; belongs to the functional core layer.
 *
 * @param {Object} delta - { addNodes, addAdjacency, deleteNodes }
 * @returns {Object} updated graph state
 */
export function applyDeltaWithFiltering(delta) {
    const state = getGraphState();

    // The set of nodes after removing deleteNodes 
    const nodes = new Set(Object.keys(state.nodes));
    (delta.deleteNodes || []).forEach(id => nodes.delete(id));

    // Added nodes must have incoming from addAdjacency.
    // And the sourceId must be from finalNodes.
    // Todo: Decide what to do when the root is expanded. The current design
    // deletes the root. A better option is to accept many roots 
    // or, even better, let the user interactively decide in that case. 


    const validNodes = {};
    if (delta.addNodes) {
        for (const sourceId in delta.addAdjacency) {
            for (const targetId in delta.addAdjacency[sourceId]) {
                if (targetId in delta.addNodes && nodes.has(sourceId)) {
                    validNodes[targetId] = delta.addNodes[targetId];
                }
            }
        }
    }

    // Add the valid nodes. 
    if (validNodes) {
        Object.keys(validNodes).forEach(id => nodes.add(id));
    }

    // Filter adjacency: remove edges whose source or target is missing
    const validAdjacency = {};
    if (delta.addAdjacency) {
        for (const src in delta.addAdjacency) {
            if (!nodes.has(src))
                continue; // skip invalid source
            const targets = Object.entries(delta.addAdjacency[src])
                    .filter(([tgt]) => nodes.has(tgt));
            if (targets.length > 0) {
                validAdjacency[src] = Object.fromEntries(targets);
            }
        }
    }

    // Apply filtered delta to the graph state
    const newState = applyDelta({
        addNodes: validNodes || {},
        addAdjacency: validAdjacency,
        deleteNodes: delta.deleteNodes || []
    },
            {'incrementalIncoming': true}
    );
    return newState;
}

/**
 * Computes a structural delta between two snapshots.
 * Delta model supports node and edge additions/deletions.
 *
 * Returns:
 * {
 *   addNodes: {id: nodeObj},
 *   deleteNodes: [id],
 *   addAdjacency: {src: {tgt: edgeObj}},
 *   deleteAdjacency: {src: {tgt: true}}
 * }
 */
export function computeDelta(fromState, toState) {
  const addNodes = {};
  const deleteNodes = [];

  const addAdjacency = {};
  const deleteAdjacency = {};

  const fromNodes = fromState?.nodes || {};
  const toNodes = toState?.nodes || {};
  const fromAdj = fromState?.adjacency || {};
  const toAdj = toState?.adjacency || {};

  // Nodes
  for (const id in fromNodes) {
    if (!(id in toNodes)) deleteNodes.push(id);
  }
  for (const id in toNodes) {
    if (!(id in fromNodes)) addNodes[id] = toNodes[id];
  }

  // Edges: deletions (present in from, absent in to)
  for (const src in fromAdj) {
    for (const tgt in (fromAdj[src] || {})) {
      if (!toAdj[src] || !(tgt in toAdj[src])) {
        deleteAdjacency[src] ||= {};
        deleteAdjacency[src][tgt] = true;
      }
    }
  }

  // Edges: additions (present in to, absent in from)
  for (const src in toAdj) {
    for (const tgt in (toAdj[src] || {})) {
      if (!fromAdj[src] || !(tgt in fromAdj[src])) {
        addAdjacency[src] ||= {};
        addAdjacency[src][tgt] = toAdj[src][tgt];
      }
    }
  }

  return { addNodes, deleteNodes, addAdjacency, deleteAdjacency };
}

/**
 * Invert a delta (structural inverse).
 * Note: This requires that the delta already contains explicit deleteAdjacency
 * and explicit deleteNodes (not just "implicit" deletions).
 *
 * @param {Object} delta - output of computeDelta or canonical delta
 * @param {Object} beforeState - snapshot of state *before* applying delta (needed to restore deleted content)
 */
export function inverseDelta(delta, beforeState) {
  const inv = {
    addNodes: {},
    deleteNodes: [],
    addAdjacency: {},
    deleteAdjacency: {}
  };

  // Invert node additions -> node deletions
  for (const id in (delta.addNodes || {})) inv.deleteNodes.push(id);

  // Invert node deletions -> node additions (need beforeState content)
  for (const id of (delta.deleteNodes || [])) {
    const nodeObj = beforeState?.nodes?.[id];
    if (nodeObj) inv.addNodes[id] = nodeObj;
  }

  // Invert edge additions -> edge deletions
  for (const src in (delta.addAdjacency || {})) {
    for (const tgt in (delta.addAdjacency[src] || {})) {
      inv.deleteAdjacency[src] ||= {};
      inv.deleteAdjacency[src][tgt] = true;
    }
  }

  // Invert edge deletions -> edge additions (need beforeState content)
  for (const src in (delta.deleteAdjacency || {})) {
    for (const tgt in (delta.deleteAdjacency[src] || {})) {
      const edgeObj = beforeState?.adjacency?.[src]?.[tgt];
      if (edgeObj !== undefined) {
        inv.addAdjacency[src] ||= {};
        inv.addAdjacency[src][tgt] = edgeObj;
      }
    }
  }

  return inv;
}
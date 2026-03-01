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
    });

    return newState;
}
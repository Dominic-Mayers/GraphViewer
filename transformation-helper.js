// transformation-helper.js
import { getGraphState, applyDelta } from './graph-state.js';

/**
 * Apply a delta (nodes + adjacency) to the graph state with filtering
 * at the application layer.
 * Removes edges whose source or target does not exist in the current graph state.
 *
 * @param {Object} delta - { addNodes, addAdjacency, deleteNodes }
 */
export function applyDeltaWithFiltering(delta) {
    // Needed only to filtering.
    const state = getGraphState();

    // Filter adjacency: remove edges with missing source or target
    const validAdjacency = {};
    if (delta.addAdjacency) {
        for (const src in delta.addAdjacency) {
            if (!state.nodes[src] && !(delta.addNodes && delta.addNodes[src])) {
                continue; // source missing, skip
            }
            console.log ('delta.addAjacency[src] :', delta.addAdjacency[src] );
            const srcArray = Object.entries(delta.addAdjacency[src]); 
            console.log ('srcArray :', srcArray );
            
            const targets = srcArray.filter(
                ([tgt]) => state.nodes[tgt] || (delta.addNodes && delta.addNodes[tgt])
            );
            if (targets.length > 0) {
                validAdjacency[src] = Object.fromEntries(targets);
            }
        }
    }

    // Apply the filtered delta to the state
    const graphState = applyDelta({
        addNodes: delta.addNodes || {},
        addAdjacency: validAdjacency,
        deleteNodes: delta.deleteNodes || []
    });

    return graphState;
}
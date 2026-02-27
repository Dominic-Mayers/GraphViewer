// assets/graph/transformations.js
import { getGraphState, applyDelta, getGraphId } from './graph-state.js';
import { applyDeltaWithFiltering } from './transformation-helper.js';
import { renderState } from './render-state.js'; 


export async function expandGroup(groupId) {
    const state = getGraphState(); // fetch current graph state

    // 1. Compute the delta for expanding the group
    //    This typically comes from a server response or local logic
    const graphId = getGraphId();
    const response = await fetch(`/expandGroup/${graphId}/${groupId}`);
    if (!response.ok) throw new Error('Failed to fetch expandGroup payload');

    const payload = await response.json();
    
    const delta = {
        addNodes: payload.subgraph.nodes,       // nodes to add when expanding
        addAdjacency: payload.subgraph.adjacency,   // edges to add when expanding
        deleteNodes: payload.deleteNodes // remove the group placeholder node
    };

    // 2. Apply delta via the extra layer
    //    - automatically filters invalid edges (missing source/target)
    //    - applies incrementally to graph-state.js
    //    - returns updated state (optional)
    const updatedState = applyDeltaWithFiltering(delta);

    const container = document.getElementById('graph-container');
    renderState(container, updatedState, false); 

    return updatedState; // optional, can be used by a wrapper for rendering
}

export async function collapseGroup(groupId) {
    const state = getGraphState();

    const graphId = getGraphId();
    const response = await fetch(`/collapseGroup/${graphId}/${groupId}`);
    const payload = await response.json();
    
    const delta = {
        addNodes: payload.subgraph.nodes, // add the group placeholder node
        addAdjacency: payload.subgraph.adjacency,   // add edges to place holder
        deleteNodes: payload.deleteNodes    // delete the inner nodes
    };

    // 2. Apply delta via the extra layer
    //    - automatically filters invalid edges (missing source/target)
    //    - applies incrementally to graph-state.js
    //    - returns updated state (optional)
    const updatedState = applyDeltaWithFiltering(delta);

    const container = document.getElementById('graph-container');
    renderState(container, updatedState, false); 

    return updatedState; // optional, can be used by a wrapper for rendering
}

/**
 * Restrict the graph to all nodes reachable from a given start node.
 * Uses BFS traversal on the current graph state.
 * 
 * @param {string} startNodeId - Node to start traversal from
 * @param {HTMLElement} container - Graph container for rendering
 */
export function restrictToReachable(startNodeId, container) {
    const state = getGraphState();
    const visited = new Set();
    const queue = [startNodeId];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!visited.has(current) && state.nodes[current]) {
            visited.add(current);

            // Enqueue all adjacent nodes
            const targets = state.adjacency[current];
            if (targets) {
                for (const tgtId in targets) {
                    if (!visited.has(tgtId)) {
                        queue.push(tgtId);
                    }
                }
            }
        }
    }

    // Build subgraph of reachable nodes
    const subgraphNodes = {};
    const subgraphAdjacency = {};
    visited.forEach(nodeId => {
        subgraphNodes[nodeId] = state.nodes[nodeId];
        if (state.adjacency[nodeId]) {
            subgraphAdjacency[nodeId] = {};
            for (const tgtId in state.adjacency[nodeId]) {
                if (visited.has(tgtId)) {
                    subgraphAdjacency[nodeId][tgtId] = state.adjacency[nodeId][tgtId];
                }
            }
        }
    });

    // Determine nodes to delete (all nodes not reachable)
    const deleteNodes = Object.keys(state.nodes).filter(id => !visited.has(id));

    // Apply the transformation using the helper
    applyDelta({
        deleteNodes,
        subgraph: { nodes: subgraphNodes, adjacency: subgraphAdjacency }
    });
}
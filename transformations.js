// assets/graph/transformations.js
import { getGraphState, setGraphState } from './graph-state.js';
import { applyGraphTransformation } from './graph-helper.js';

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
    applyGraphTransformation({
        deleteNodes,
        subgraph: { nodes: subgraphNodes, adjacency: subgraphAdjacency }
    }, container);
}
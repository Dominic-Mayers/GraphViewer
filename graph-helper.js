// assets/graph/graph-helper.js
import { getGraphState, setGraphState } from './graph-state.js';
import { renderState } from './render-state.js';

/**
 * Apply a graph transformation: delete nodes, insert subgraph, render.
 * Compatible with Part 2 SPA.
 * 
 * @param {Object} params
 * @param {Object} [params.subgraph] - { nodes, adjacency } to insert
 * @param {Array<string>} [params.deleteNodes] - nodeIds to remove
 * @param {HTMLElement} container - graph container
 * @param {boolean} [params.preserveView=true] - whether to preserve pan/zoom
 */
export function applyGraphTransformation({ subgraph, deleteNodes, preserveView = true }, container) {
    const state = getGraphState();

    // --- Delete nodes ---
    if (deleteNodes) {
        for (const nodeId of deleteNodes) {
            delete state.nodes[nodeId];
            delete state.adjacency[nodeId];
        }
        // Remove references in adjacency
        for (const src in state.adjacency) {
            for (const tgt of deleteNodes) {
                delete state.adjacency[src][tgt];
            }
        }
    }

    // --- Insert subgraph ---
    if (subgraph) {
        const { nodes = {}, adjacency = {} } = subgraph;
        Object.assign(state.nodes, nodes);
        for (const src in adjacency) {
            state.adjacency[src] = state.adjacency[src] || {};
            Object.assign(state.adjacency[src], adjacency[src]);
        }
    }

    // --- Update SPA state ---
    setGraphState(state);

    // --- Render, preserving view if requested ---
    renderState(container, state, preserveView);
}
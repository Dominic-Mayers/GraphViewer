// assets/graph/initialize-from-dom.js
// Reads initial graph state from the DOM and stores it in graph-state.js

import { setGraphState } from './graph-state.js';

/**
 * Reads the JSON-encoded graph state from <script id="graph-data">
 * and stores it in the SPA's graph state module
 * @returns {Object} the initialized state
 */
export function initializeGraphFromDOM() {
    const jsonElement = document.getElementById("graph-data");
    if (!jsonElement) {
        throw new Error("Initial JSON state element not found in DOM");
    }

    // Parse JSON string
    const dataArray = JSON.parse(jsonElement.textContent);
    const [nodes, adjacency, graphId] = dataArray;

    const initialState = {
        nodes: nodes || {},
        adjacency: adjacency || {},
        graphId: graphId
    };

    // Store in graph-state
    setGraphState(initialState);
    
    return initialState;
}

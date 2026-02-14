// graph-state.js
// Stores the SPA's structural graph state

let graphState = {
    nodes: {},
    adjacency: {}
};

/**
 * Returns the current graph state
 */
export function getGraphState() {
    return graphState;
}

/**
 * Replaces the graph state with a new one
 * @param {Object} newState - { nodes: {...}, adjacency: {...} }
 */
export function setGraphState(newState) {
    graphState = newState;
}

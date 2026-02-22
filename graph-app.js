// assets/graph/graph-app.js
import { initializeGraphFromDOM } from './initialize-from-dom.js';
import { renderState } from './render-state.js';
// Test
//import { applyGraphTransformation } from './graph-helper.js';
import { restrictToReachable } from './transformations.js'; 

const container = document.getElementById('graph-container');


if (!container) {
    console.error('Graph container not found');
} else {
    try {
        const state = initializeGraphFromDOM();
        renderState(container, state);
    } catch (err) {
        console.error('Failed to initialize graph:', err);
    }
}

window.restrict = (nodeId) => {
    restrictToReachable(
        nodeId,
        document.getElementById('graph-container')
    );
};
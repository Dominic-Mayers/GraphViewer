// graph-app.js
import { initializeGraphFromDOM } from './initialize-from-dom.js';
import { renderState } from './render-state.js';

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

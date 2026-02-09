// graph-app.js
// Entrypoint – no exports

import { initialState } from './initial-state.js';
import { renderSVG } from './render-svg.js';
import { initPanZoom } from './pan-zoom.js';
import { initPopupMenu } from './popup-menu.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('graph-container');

    if (!container) {
        console.error('Graph container not found');
        return;
    }

    // initialState currently contains the SVG string
    const svgString = initialState;

    if (!svgString || typeof svgString !== 'string') {
        console.error('Initial SVG state is invalid:', svgString);
        return;
    }

    // 1. Render SVG
    renderSVG(container, svgString);

    // 2. Enable pan/zoom
    const panZoomInstance = initPanZoom(container);

    // 3. Initialize popup menu
    initPopupMenu(container);

    // Optional: expose for debugging in console
    window.graphDebug = {
        container,
        panZoom: panZoomInstance
    };
    
});

// render-svg.js
// Currently, called in graph-app.js
// Eventually, will be called by render-state.js, when states are managed. 

import { insertSVG } from './insert-svg.js';
import { initPanZoom } from './pan-zoom.js';
import { initPopupMenu } from './popup-menu.js';

export function renderSVG(container, svgString) {
    
    // 1. Insert SVG
    insertSVG(container, svgString);

    // 2. Enable pan/zoom
    const panZoomInstance = initPanZoom(container);

    // 3. Initialize popup menu
    initPopupMenu(container);

    // Optional: expose for debugging in console
    window.graphDebug = {
        container,
        panZoom: panZoomInstance
    };
};
